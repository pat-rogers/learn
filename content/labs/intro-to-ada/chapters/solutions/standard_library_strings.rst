Standard library: Strings
-------------------------

Concatenation
~~~~~~~~~~~~~

.. code:: ada lab=Solutions.Standard_Library_Strings.Concatenation

    --  START LAB IO BLOCK
    in 0:Unbounded_Concat_No_Trim_No_WS_Chk
    out 0:Hello World!
    in 1:Unbounded_Concat_Trim_No_WS_Chk
    out 1:This_is_a_check
    in 2:String_Concat_Trim_WS_Chk
    out 2:This is a test.
    in 3:Concat_Single_Element
    out 3:Hi
    --  END LAB IO BLOCK

    with Ada.Strings.Unbounded; use Ada.Strings.Unbounded;

    package Str_Concat is

       type Unbounded_Strings is array (Positive range <>) of Unbounded_String;

       function Concat (USA            : Unbounded_Strings;
                        Trim_Str       : Boolean;
                        Add_Whitespace : Boolean) return Unbounded_String;

       function Concat (USA            : Unbounded_Strings;
                        Trim_Str       : Boolean;
                        Add_Whitespace : Boolean) return String;

    end Str_Concat;

    with Ada.Strings; use Ada.Strings;

    package body Str_Concat is

       function Concat (USA            : Unbounded_Strings;
                        Trim_Str       : Boolean;
                        Add_Whitespace : Boolean) return Unbounded_String is

          function Retrieve (USA        : Unbounded_Strings;
                             Trim_Str   : Boolean;
                             Index      : Positive) return Unbounded_String is
             US_Internal : Unbounded_String := USA (Index);
          begin
             if Trim_Str then
                US_Internal := Trim (US_Internal, Both);
             end if;
             return US_Internal;
          end Retrieve;

          US : Unbounded_String := To_Unbounded_String ("");
       begin
          for I in USA'First .. USA'Last - 1 loop
             US := US & Retrieve (USA, Trim_Str, I);
             if Add_Whitespace then
                US := US & " ";
             end if;
          end loop;
          US := US & Retrieve (USA, Trim_Str, USA'Last);

          return US;
       end Concat;

       function Concat (USA            : Unbounded_Strings;
                        Trim_Str       : Boolean;
                        Add_Whitespace : Boolean) return String is
       begin
          return To_String (Concat (USA, Trim_Str, Add_Whitespace));
       end Concat;

    end Str_Concat;

    with Ada.Command_Line;        use Ada.Command_Line;
    with Ada.Text_IO;             use Ada.Text_IO;
    with Ada.Strings.Unbounded;   use Ada.Strings.Unbounded;

    with Str_Concat;              use Str_Concat;

    procedure Main is
       type Test_Case_Index is
         (Unbounded_Concat_No_Trim_No_WS_Chk,
          Unbounded_Concat_Trim_No_WS_Chk,
          String_Concat_Trim_WS_Chk,
          Concat_Single_Element);

       procedure Check (TC : Test_Case_Index) is
       begin
          case TC is
             when Unbounded_Concat_No_Trim_No_WS_Chk =>
                declare
                   S : constant Unbounded_Strings := (
                      To_Unbounded_String ("Hello"),
                      To_Unbounded_String (" World"),
                      To_Unbounded_String ("!"));
                begin
                   Put_Line (To_String (Concat (S, False, False)));
                end;
             when Unbounded_Concat_Trim_No_WS_Chk =>
                declare
                   S : constant Unbounded_Strings := (
                      To_Unbounded_String (" This "),
                      To_Unbounded_String (" _is_ "),
                      To_Unbounded_String ("  a   "),
                      To_Unbounded_String (" _check "));
                begin
                   Put_Line (To_String (Concat (S, True, False)));
                end;
             when String_Concat_Trim_WS_Chk =>
                declare
                   S : constant Unbounded_Strings := (
                       To_Unbounded_String ("  This  "),
                       To_Unbounded_String ("  is a  "),
                       To_Unbounded_String ("  test.  "));
                begin
                   Put_Line (Concat (S, True, True));
                end;
             when Concat_Single_Element =>
                declare
                   S : constant Unbounded_Strings := (
                       1 => To_Unbounded_String ("  Hi "));
                begin
                   Put_Line (Concat (S, True, True));
                end;
          end case;
       end Check;

    begin
       if Argument_Count < 1 then
          Put_Line ("ERROR: missing arguments! Exiting...");
          return;
       elsif Argument_Count > 1 then
          Put_Line ("Ignoring additional arguments...");
       end if;

       Check (Test_Case_Index'Value (Argument (1)));
    end Main;

List of events
~~~~~~~~~~~~~~

.. code:: ada lab=Solutions.Standard_Library_Strings.List_of_Events

    --  START LAB IO BLOCK
    in 0:Unbounded_String_Chk
    out 0:Checked
    in 1:Event_List_Chk
    out 1:EVENTS LIST - 2018-01-01     - New Year's Day - 2018-02-16     - Final check     - Release - 2018-12-03     - Brother's birthday
    --  END LAB IO BLOCK

    with Ada.Strings.Unbounded;  use Ada.Strings.Unbounded;
    with Ada.Containers.Vectors;

    package Events is

       subtype Event_Item is Unbounded_String;

       package Event_Item_Containers is new
         Ada.Containers.Vectors
           (Index_Type   => Positive,
            Element_Type => Event_Item);

       subtype Event_Items is Event_Item_Containers.Vector;

    end Events;

    with Ada.Calendar;                use Ada.Calendar;
    with Ada.Containers.Ordered_Maps;

    package Events.Lists is

       type Event_List is tagged private;

       procedure Add (Events     : in out Event_List;
                      Event_Time :        Time;
                      Event      :        String);

       procedure Display (Events : Event_List);

    private

       package Event_Time_Item_Containers is new
         Ada.Containers.Ordered_Maps
           (Key_Type         => Time,
            Element_Type     => Event_Items,
            "="              => Event_Item_Containers."=");

       type Event_List is new Event_Time_Item_Containers.Map with null record;

    end Events.Lists;

    with Ada.Text_IO;             use Ada.Text_IO;
    with Ada.Calendar.Formatting; use Ada.Calendar.Formatting;

    package body Events.Lists is

       procedure Add (Events     : in out Event_List;
                      Event_Time : Time;
                      Event      : String) is
          use Event_Item_Containers;
          E : constant Event_Item := To_Unbounded_String (Event);
       begin
          if not Events.Contains (Event_Time) then
             Events.Include (Event_Time, Empty_Vector);
          end if;
          Events (Event_Time).Append (E);
       end Add;

       function Date_Image (T : Time) return String is
          Date_Img : constant String := Image (T);
       begin
          return Date_Img (1 .. 10);
       end;

       procedure Display (Events : Event_List) is
          use Event_Time_Item_Containers;
          T : Time;
       begin
          Put_Line ("EVENTS LIST");
          for C in Events.Iterate loop
             T := Key (C);
             Put_Line ("- " & Date_Image (T));
             for I of Events (C) loop
                Put_Line ("    - " & To_String (I));
             end loop;
          end loop;
       end Display;

    end Events.Lists;

    with Ada.Command_Line;        use Ada.Command_Line;
    with Ada.Text_IO;             use Ada.Text_IO;
    with Ada.Calendar;
    with Ada.Calendar.Formatting; use Ada.Calendar.Formatting;
    with Ada.Strings.Unbounded;   use Ada.Strings.Unbounded;

    with Events;
    with Events.Lists;            use Events.Lists;

    procedure Main is
       type Test_Case_Index is
         (Unbounded_String_Chk,
          Event_List_Chk);

       procedure Check (TC : Test_Case_Index) is
          EL : Event_List;
       begin
          case TC is
             when Unbounded_String_Chk =>
                declare
                   S : constant Events.Event_Item := To_Unbounded_String ("Checked");
                begin
                   Put_Line (To_String (S));
                end;
             when Event_List_Chk =>
                EL.Add (Time_Of (2018, 2, 16),
                        "Final check");
                EL.Add (Time_Of (2018, 2, 16),
                        "Release");
                EL.Add (Time_Of (2018, 12, 3),
                        "Brother's birthday");
                EL.Add (Time_Of (2018, 1, 1),
                        "New Year's Day");
                EL.Display;
          end case;
       end Check;

    begin
       if Argument_Count < 1 then
          Put_Line ("ERROR: missing arguments! Exiting...");
          return;
       elsif Argument_Count > 1 then
          Put_Line ("Ignoring additional arguments...");
       end if;

       Check (Test_Case_Index'Value (Argument (1)));
    end Main;
