import {Cookies} from 'typescript-cookies'

import {Area, OutputArea, LabContainer} from './areas';
import {Editor, EditorTheme} from './editor';
import {getElemsByClass, getElemById, getElemsByTag}
  from './dom-utils';
import {downloadProject, UnparsedSwitches,
  getUnparsedSwitches} from './download';
import {Resource, ResourceList} from './resource';
import {ServerWorker} from './server';
import {RunProgram, CheckOutput} from './server-types';
import * as Strings from './strings';

interface EditorView {
  readonly header: HTMLButtonElement;
  readonly editor: Editor;
}

type EditorMap = Map<string, EditorView>;

const cookies = new Cookies({
  path: '/',
  secure: true,
  samesite: 'none',
})

/**
 * Defines the widget behavior
 * @class Widget
 */
class Widget {
  // model object
  private readonly name: string;
  private readonly main: string;
  private readonly server: string;
  private readonly id: string;
  private readonly shadowFiles: ResourceList = [];
  private readonly codeBlockInfo: ResourceList = [];

  // view objects
  protected readonly container: HTMLDivElement;
  protected readonly outputArea: OutputArea;
  public readonly viewMap: EditorMap = new Map();

  // other object
  private readonly editor: Editor;

  /**
   * Creates an instance of Widget and attaches logic to DOM
   * @param {HTMLDivElement} elem - the container for the widget
   * @param {(EditorMap | undefined)} dep - The view of widgets with the same
   *  name on the current page
   */
  constructor(elem: HTMLDivElement, dep: EditorMap | undefined) {
    this.server = elem.dataset.url as string;
    this.container = elem;

    // Read attributes from container object to initialize members
    this.id = this.container.id;
    this.name = elem.dataset.name as string;
    this.main = elem.dataset.main as string;

    // add widget dependencies from up page to the EditorView
    if (dep) {
      // Shallow copy the dep map into our map
      for (const [k, v] of dep.entries()) {
        this.viewMap.set(k, v);
      }
    }

    // Initialize editor
    const edDiv =
      this.getElem('editors', 'editor') as HTMLDivElement;
    this.editor = new Editor(edDiv);

    // Parse files
    const files = getElemsByClass(this.container, 'file');
    // Check to make sure we have files in the widget
    if (files.length == 0) {
      throw Error('Malformed widget: No files present.');
    }
    for (const file of files) {
      const basename = file.dataset.basename as string;
      const content = file.textContent ? file.textContent : '';
      this.editor.addSession(basename, content);

      const editorPane =
        this.getElem(
            'editors',
            'non-tabbed-editor', basename) as HTMLDivElement;
      this.editor.addNonTabbedEditor(basename, editorPane);
    }

    // Parse shadow files
    const shadowFiles = getElemsByClass(this.container, 'shadow-file');
    for (const file of shadowFiles) {
      const a: Resource = {
        basename: file.dataset.basename as string,
        contents: file.textContent ? file.textContent : '',
      };
      this.shadowFiles.push(a);
    }

    // Parse code block info
    const codeBlockInfo = getElemsByClass(this.container, 'code-block-info');
    for (const info of codeBlockInfo) {
      const a: Resource = {
        basename: info.dataset.basename as string,
        contents: info.textContent ? info.textContent : '',
      };
      this.codeBlockInfo.push(a);
    }
    // Setup editor tabs
    const tab = this.getElem('tab');
    const headers = getElemsByTag(tab, 'button');
    for (const h of headers) {
      const basename = h.textContent ? h.textContent : '';
      const newView: EditorView = {
        header: this.getElem('tab', basename) as HTMLButtonElement,
        editor: this.editor,
      };

      h.addEventListener('click', () => {
        for (const i of headers) {
          i.classList.remove('active');
        }
        h.classList.add('active');
        this.editor.setSession(basename);
      });

      this.viewMap.set(basename, newView);
    }

    // simulate click on the first tab to show it
    headers[0].click();

    // attach button logic
    const buttonGroup = this.getElem('button-group');
    const buttons = getElemsByTag(buttonGroup, 'button');
    for (const btn of buttons) {
      const mode = btn.dataset.mode as string;
      btn.addEventListener('click', async () => {
        buttons.forEach((btn) => btn.setAttribute('disabled', ''));
        await this.buttonCB(mode);
        buttons.forEach((btn) => btn.removeAttribute('disabled'));
      });
    }

    // Get tabbed view status from cookie
    const cookieTabbedView = cookies.get('tabbed_view') as string;
    const tabbedView = (cookieTabbedView != 'false');

    // attach handlers to the settings bar items
    const tabSetting =
      this.getElem('settings-bar', 'tab-setting') as HTMLInputElement;
    tabSetting.checked = tabbedView;
    this.setTabbedView(tabbedView);

    tabSetting.addEventListener('change', () => {
      if (window.confirm(Strings.RELOAD_CONFIRM_MSG)) {
        let tabbedView = 'true';
        if (!tabSetting.checked) {
          tabbedView = 'false';
        }
        cookies.set('tabbed_view', tabbedView, {expires: 3650});
        this.setTabbedView(tabSetting.checked);

        // Current approach: just reload the page to
        // set the correct theme for all widgets.
        location.reload();
      }
      else
      {
        // Revert if user chooses "no change"
        tabSetting.checked = !tabSetting.checked;
      }
    });

    this.initCompilerSwitches();

    // Get selected theme from cookie
    const cookieTheme = cookies.get('theme') as string;

    const themeSetting =
      this.getElem('settings-bar', 'theme-setting') as HTMLInputElement;
    // Set checkbox according to value from cookie
    themeSetting.checked = (cookieTheme == 'dark');
    this.setTheme(cookieTheme);

    themeSetting.addEventListener('change', () => {
      if (window.confirm(Strings.RELOAD_CONFIRM_MSG)) {
        let theme = 'light';
        if (themeSetting.checked) {
          theme = 'dark';
        }
        cookies.set('theme', theme, {expires: 3650});
        this.setTheme(theme);

        // Current approach: just reload the page to
        // set the correct theme for all widgets.
        location.reload();
      }
      else
      {
        // Revert if user chooses "no change"
        themeSetting.checked = !themeSetting.checked;
      }
    });

    const resetButton =
      this.getElem('settings-bar', 'reset-btn') as HTMLButtonElement;
    resetButton.addEventListener('click', () => {
      if (window.confirm(Strings.RESET_CONFIRM_MSG)) {
        this.resetEditors();
        this.initCompilerSwitches();
      }
    });

    const dlButton = this.getElem('settings-bar', 'download-btn');
    dlButton.addEventListener('click', async () => {
      this.outputArea.reset();
      const files = this.collectResources();
      const switches = JSON.parse(this.container.dataset.switches as string);
      const activeSwitches: UnparsedSwitches = {
        Builder: switches['Builder'],
        Compiler: this.getActiveCompilerSwitches()};
      const main = this.container.dataset.main as string;
      const sparkMode = true;
      downloadProject(files, activeSwitches, main, this.name, sparkMode);
    });

    // grab reference to output area in the HTML and construct area
    const outputArea = this.getElem('output-area') as HTMLDivElement;
    this.outputArea = new OutputArea(outputArea);

    // add code block info
    for (const r of this.codeBlockInfo) {
      const outputCodeBlockInfo = this.getElem(
          'code_block_info',
          r.basename,
          'contents') as HTMLDivElement;
      outputCodeBlockInfo.innerText = r.contents;
    }
  }

  /**
   * Collect resources from the current view
   * @returns {ResourceList} return the widget resources
   */
  protected collectResources(): ResourceList {
    const ret: ResourceList = [];
    // get files from view
    for (const [basename, view] of this.viewMap) {
      const r: Resource = {
        basename: basename,
        contents: view.editor.getSessionContent(basename),
      };
      ret.push(r);
    }
    // add shadow files
    for (const sf of this.shadowFiles) {
      ret.push(sf);
    }
    // TODO: add cli contents to files
    return ret;
  }

  /**
   * Construct the server address string
   * @param {string} url - the url suffix
   * @returns {string} - the full constructed url
   */
  private serverAddress(url: string): string {
    return this.server + '/' + url + '/';
  }


  /**
   * Gets default compiler switches set on widget.
   * @returns {Array<string>} - The active compiler switches.
   */
  private getDefaultCompilerSwitches(): Array<string> {
    return [
      '-g',
      '-O0',
    ];
  }

  /**
   * Gets active compiler switches set on widget.
   * @returns {Array<string>} - The active compiler switches.
   */
  private getActiveCompilerSwitches(): Array<string> {
    const compilerSwitchesSetting =
      this.getElem('settings-bar', 'compiler-switches');

    const compilerSwitches =
      compilerSwitchesSetting.getElementsByClassName(
          'compiler-switch') as HTMLCollectionOf<HTMLInputElement>;

    const defaultSwitches = this.getDefaultCompilerSwitches();

    const activeCompilerSwitches: Array<string> = [];

    for (const sw of compilerSwitches) {
      if (!defaultSwitches.includes(sw.name)) {
        if (sw.checked) {
          activeCompilerSwitches.push(sw.name);
        }
      }
    }

    return activeCompilerSwitches;
  }


  /**
   * Initialize compiler switches (checkboxes) on widget.
   */
  private initCompilerSwitches(): void {
    const compilerSwitchesSetting =
      this.getElem('settings-bar', 'compiler-switches');

    const compilerSwitchEntries =
      compilerSwitchesSetting.getElementsByClassName(
          'compiler-switch-entry') as HTMLCollectionOf<HTMLDivElement>;

    const rawUsedSwitches = this.container.dataset.switches as string;

    const usedSwitches: UnparsedSwitches =
     getUnparsedSwitches(rawUsedSwitches);

    const defaultSwitches = this.getDefaultCompilerSwitches();

    const allMutuallyExclSw: Array<Array<string>> = [
      ['-gnato', '-gnato0', '-gnato11', '-gnato21', '-gnato22', '-gnato23'],
      ['-gnatyM50', '-gnatyM80'],
    ];

    for (const swe of compilerSwitchEntries) {
      const sw : HTMLInputElement =
        swe.getElementsByClassName(
            'compiler-switch')[0] as HTMLInputElement;
      const swHelpSpan : HTMLSpanElement =
        swe.getElementsByClassName(
            'compiler-switch-help')[0] as HTMLSpanElement;
      const b : HTMLButtonElement =
        swHelpSpan.getElementsByTagName('button')[0] as HTMLButtonElement;

      const switchName = sw.name;
      sw.checked = usedSwitches['Compiler'].includes(switchName) ||
        defaultSwitches.includes(switchName);
      sw.disabled = defaultSwitches.includes(switchName);

      sw.addEventListener('change', () => {
        //
        // Handle mutually exclusive switches when a single
        // switch is changed by the user.
        //
        const isChecked = sw.checked;
        for (const mutuallyExclSw of allMutuallyExclSw) {
          if (mutuallyExclSw.includes(switchName)) {
            // 1. Deactivate all mutually exclusive switches
            for (const swe2 of compilerSwitchEntries) {
              const sw2 : HTMLInputElement =
                swe2.getElementsByClassName(
                    'compiler-switch')[0] as HTMLInputElement;
              if (mutuallyExclSw.includes(sw2.name)) {
                sw2.checked = false;
              }
            }
            // 2. Restore state for the switch changed by the user
            sw.checked = isChecked;
          }
        }
      });

      const d =
        compilerSwitchesSetting.getElementsByClassName(
            'compiler-switch-help-info')[0];
      d.addEventListener('click', () => {
        if (! d.classList.contains('disabled')) {
          d.innerHTML = '';
          d.classList.add('disabled');
        }
      });

      b.addEventListener('click', () => {
        d.innerHTML = '<b>' + switchName + '</b>: ' +
            b.title + '<br/>' +
            '<div class="compiler-switch-help-info-click-remove">(' +
            Strings.COMPILER_SWITCH_REMOVE_HELP_MESSAGE +
            ')</div>';

        d.classList.remove('disabled');
      });
    }
  }

  /**
   * Set the editor theme
   * @param {string} themeStr - the theme for the editor
   */
  private setTheme(themeStr : string) : void {
    let theme = EditorTheme.Light;
    if (themeStr == 'dark') {
      theme = EditorTheme.Dark;
    }

    for (const t of this.viewMap.values()) {
      t.editor.setTheme(theme);
    }
  }

  /**
   * Set status for tabbed view of editor
   * @param {string} isTabbed - use tabbed view
   */
  private setTabbedView(isTabbed : boolean) : void {
    const editorContainer =
      this.getElem('editors', 'editor');
    const nontabbedEditorContainer =
      this.getElem('editors', 'non-tabbed-editor');

    //  Show / hide editor containers
    editorContainer.hidden = ! isTabbed;
    nontabbedEditorContainer.hidden = isTabbed;

    //  Show / hide buttons (for tabbed view)
    const tab = this.getElem('tab');
    const headers = getElemsByTag(tab, 'button');
    for (const h of headers) {
      h.hidden = ! isTabbed;
    }

    // Ask editor to refresh ACE editor
    this.editor.refresh(isTabbed);
  }


  /**
   * Gets an element by its id inside the current widget layout
   * The ids inside the widget are in the form:
   * <widget number>.<item>.<sub item>
   * This function will prepend the widget number to the args passed in.
   * An example would be:
   * this.getElem('foo', 'bar) would return an element with the ID
   * <widget number>.foo.bar
   * @protected
   * @param {...Array<string>} args - The list of args to append
   * @returns {HTMLElement} - The element with the ID
   */
  protected getElem(...args: Array<string>): HTMLElement {
    const fullId = [this.id].concat(args).join('.');
    return getElemById(fullId);
  }

  /**
   * The main callback for the widget buttons
   * @param {string} mode - the mode of the button that triggered the event
   * @param {boolean} lab - specifies if this is a lab widget
   */
  protected async buttonCB(mode: string, lab = false): Promise<void> {
    this.outputArea.reset();

    // Clear any annotations added from previous button click
    for (const t of this.viewMap.values()) {
      t.editor.clearGutterAnnotation();
    }

    this.outputArea.add(['output_info', 'console_output'],
        Strings.CONSOLE_OUTPUT_LABEL + ':');
    this.outputArea.showSpinner(true);

    const files = this.collectResources();

    const switches = JSON.parse(this.container.dataset.switches as string);
    switches['Compiler'] = this.getActiveCompilerSwitches();

    const serverData: RunProgram.TSData = {
      files: files,
      main: this.main,
      mode: mode,
      switches: switches,
      name: this.name,
      lab: lab,
    };

    const worker = new ServerWorker(this.server,
        (data: CheckOutput.FS): boolean => {
          return this.processCheckOutput(data);
        });

    try {
      await worker.execute(serverData);
    } catch (error) {
      this.outputArea.addError(Strings.MACHINE_BUSY_LABEL);
      console.error('Error:', (error as Error).message);
    } finally {
      this.outputArea.showSpinner(false);
    }
  }

  /**
   * Returns the correct Area to place data in
   * @param {CheckOutput.FS} data - should be null for Widget
   * @returns {Area} the area to place returned data
   */
  protected getHomeArea(data: CheckOutput.FS): Area {
    if (data.ref !== undefined) {
      throw new Error('Malformed data packet has ref in non-lab.');
    }
    return this.outputArea;
  }

  /**
   * Handle the msg data coming back from server
   * @param {CheckOutput.RunMsg} msg - the returned msg
   * @param {Area} homeArea - the area to place the rendered msg
   */
  protected handleMsgType(msg: CheckOutput.RunMsg, homeArea: Area): void {
    let data = msg.data as string;
    switch (msg.type) {
      case 'console': {
        homeArea.addConsole(data);
        break;
      }
      case 'internal_error':
        data += ' ' + Strings.INTERNAL_ERROR_MESSAGE;
        // Intentional: fall through
      case 'stderr':
      case 'stdout': {
        // Split multiline messages into single lines for processing
        const outMsgList = data.split(/\r?\n/);
        const slocRegex = /^(?:.* )?(?<file>[a-zA-Z._0-9-]+\.ad(?:s|b)):(?<row>\d+)(?::(?<col>\d+): (?<type>\S+):)?/;
        for (const outMsg of outMsgList) {
          const match = outMsg.match(slocRegex);
          if (!match) {
            homeArea.addLine(outMsg);
            continue;
          }
          const basename = match.groups!.file;
          const view = this.viewMap.get(basename);
          if (!view) {
            // File not found, so just print the message to the homeArea
            homeArea.addLine(outMsg);
            continue;
          }

          const row = parseInt(match.groups!.row);
          const col =
            match.groups?.col == undefined ? 0 : parseInt(match.groups.col);
          const msgType =
            match.groups?.type == undefined ? 'error' : match.groups.type;

          // Lines that contain a sloc are clickable:
          const cb = (): void => {
            if (window.getSelection()?.toString() == '') {
              view.header.scrollIntoView(true);
              view.header.click();
              // Jump to corresponding line
              view.editor.gotoLine(basename, row, col);
            }
          };

          view.editor.setGutterAnnotation(basename, row, col, outMsg, msgType);

          // If the message if of type info, addInfo
          // Otherwise, addMsg
          if (msgType == 'info') {
            homeArea.addInfo(outMsg, cb);
          } else {
            homeArea.addMsg(outMsg, cb);
          }
        }
        break;
      }
      default: {
        homeArea.addLine(data);
        throw new Error('Unhandled msg type.');
      }
    }
  }

  /**
   * Process the output from "check_output" ajax request
   * @param {CheckOutput.FS} data - The data from check_output
   * @returns {number} the number of lines read by this function
   */
  private processCheckOutput(data: CheckOutput.FS): boolean {
    const homeArea = this.getHomeArea(data);
    for (const msg of data.output) {
      this.handleMsgType(msg, homeArea);
    }

    if (data.completed) {
      if (data.status != 0) {
        this.outputArea.addError(Strings.EXIT_STATUS_LABEL +
            ': ' + data.status);
      }
    }

    return data.completed;
  }

  /**
   * Reset the editors, outputArea
   */
  protected resetEditors(): void {
    this.outputArea.reset();

    for (const t of this.viewMap.values()) {
      t.editor.reset();
    }
  }
}

/**
 * The LabWidget class
 * @augments Widget
 */
export class LabWidget extends Widget {
  private readonly labContainer: LabContainer;

  /**
   * Creates an instance of LabWidget and attaches logic to DOM
   * @param {HTMLDivElement} elem - the container for the widget
   * @param {(EditorMap | undefined)} dep - The view of widgets with the same
   *  name on the current page
   */
  constructor(elem: HTMLDivElement, dep: EditorMap | undefined) {
    super(elem, dep);
    const labArea = this.getElem('lab-area') as HTMLDivElement;
    this.labContainer = new LabContainer(labArea);
  }

  /**
   * The main callback for the widget buttons
   * @param {string} mode - the mode of the button that triggered the event
   * @param {boolean} lab - specifies that this is a lab
   */
  protected async buttonCB(mode: string, lab = true): Promise<void> {
    this.labContainer.reset();
    await super.buttonCB(mode, lab);
    this.labContainer.sort();
  }

  /**
   * Returns the correct Area to place data in
   * @param {CheckOutput.FS} data - if not null, the lab ref
   * @returns {Area} the area to place returned data
   */
  protected getHomeArea(data: CheckOutput.FS): Area {
    if (data.ref !== undefined) {
      return this.labContainer.getLabArea(data.ref);
    }
    return this.outputArea;
  }

  /**
   * Handle the msg data coming back from server
   * @param {CheckOutput.RunMsg} msg - the returned msg
   * @param {Area} homeArea - the area to place the rendered msg
   */
  protected handleMsgType(msg: CheckOutput.RunMsg, homeArea: Area): void {
    switch (msg.type) {
      case 'lab': {
        const result =
          this.labContainer.processResults(msg.data as CheckOutput.LabOutput);
        this.outputArea.addLabStatus(result);
        break;
      }
      default: {
        super.handleMsgType(msg, homeArea);
      }
    }
  }

  /**
   * Reset the editors, outputArea, and labContainer
   */
  protected resetEditors(): void {
    super.resetEditors();
    this.labContainer.reset();
  }
}

type WidgetMap = Map<string, EditorMap>
type WidgetLike = Widget | LabWidget;
/**
 * Entrypoint for widget creation
 * @param {Array<HTMLDivElement>} widgets - The collection of widgets
 *    found on the page
 */
export function widgetFactory(widgets: Array<HTMLDivElement>): void {
  const widgetList: WidgetMap = new Map();

  for (const element of widgets) {
    try {
      let widget: WidgetLike;
      // Get data from element
      const name = element.dataset.name as string;
      const lab = element.dataset.lab as string;
      const depList = widgetList.get(name);

      if (lab === 'True') {
        widget = new LabWidget(element, depList);
      } else {
        widget = new Widget(element, depList);
      }

      // reset the view for this widget with the newly computed view
      widgetList.set(name, widget.viewMap);
    } catch (error) {
      // an error has occured parsing the widget
      console.error('Error:', error);

      // clear the offending element to remove any processing that was done
      element.innerHTML = '';

      // add an error message to the page in its place
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = '<p>An error has occured processing this widget.' +
      Strings.INTERNAL_ERROR_MESSAGE + '</p>';

      element.appendChild(errorDiv);
    }
  }
}
