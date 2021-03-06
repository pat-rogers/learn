Types
=====

.. include:: ../../global.txt

Enumerations
------------

We've introduced enumerations back in the
:doc:`Introduction to Ada course <courses/intro-to-ada/chapters/strongly_typed_language>`.
In this section, we'll discuss a few useful features of enumerations, such as
enumeration renaming, enumeration overloading and representation clauses.

Enumerations as functions
~~~~~~~~~~~~~~~~~~~~~~~~~

If you have used programming language such as C in the past, you're familiar
with the concept of enumerations being constants with integer values. In Ada,
however, enumerations are not integers. In fact, they're actually parameterless
functions! Let's consider this example:

.. code:: ada compile_button project=Courses.Advanced_Ada.Types.Enumeration_As_Function

    package Days is

       type Day is (Mon, Tue, Wed, Thu, Fri, Sat, Sun);

       --  Essentially, we're declaring these functions:
       --
       --  function Mon return Day;
       --  function Tue return Day;
       --  function Wed return Day;
       --  function Thu return Day;
       --  function Fri return Day;
       --  function Sat return Day;
       --  function Sun return Day;

    end Days;

In the package :ada:`Days`, we're declaring the enumeration type :ada:`Day`.
When we do this, we're essentially declaring seven parameterless functions, one
for each enumeration. For example, the :ada:`Mon` enumeration corresponds to
:ada:`function Mon return Day`. You can see all seven function declarations in
the comments of the example above.

Note that this has no direct relation to how an Ada compiler generates machine
code for enumeration. Even though enumerations are parameterless functions, a
typical Ada compiler doesn't generate function calls for code that deals with
enumerations.

Enumeration renaming
^^^^^^^^^^^^^^^^^^^^

The idea that enumerations are parameterless functions can be used when we want
to rename enumerations. For example, we could rename the enumerations of the
:ada:`Day` type like this:

.. code:: ada compile_button project=Courses.Advanced_Ada.Types.Enumeration_Renaming

    package Enumeration_Example is

       type Day is (Mon, Tue, Wed, Thu, Fri, Sat, Sun);

       function Monday    return Day renames Mon;
       function Tuesday   return Day renames Tue;
       function Wednesday return Day renames Wed;
       function Thursday  return Day renames Thu;
       function Friday    return Day renames Fri;
       function Saturday  return Day renames Sat;
       function Sunday    return Day renames Sun;

    end Enumeration_Example;

Now, we can use both :ada:`Monday` or :ada:`Mon` to refer to Monday of the
:ada:`Day` type:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Renaming

    with Ada.Text_IO;         use Ada.Text_IO;
    with Enumeration_Example; use Enumeration_Example;

    procedure Show_Renaming is
       D1 : constant Day := Mon;
       D2 : constant Day := Monday;
    begin
       if D1 = D2 then
          Put_Line ("D1 = D2");
          Put_Line (Day'Image (D1) & " =  " & Day'Image (D2));
       end if;
    end Show_Renaming;

When running this application, we can confirm that :ada:`D1` is equal to
:ada:`D2`. Also, even though we've assigned :ada:`Monday` to :ada:`D2` (instead
of :ada:`Mon`), the application displays ``Mon = Mon``, since :ada:`Monday`
is just another name to refer to the actual enumeration (:ada:`Mon`).

.. admonition:: Hint

    If you just want to have a single (renamed) enumeration visible in your
    application |mdash| and make the original enumeration invisible |mdash|,
    you can use a separate package. For example:

    .. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Renaming

        package Enumeration_Example is

           type Day is (Mon, Tue, Wed, Thu, Fri, Sat, Sun);

        end Enumeration_Example;

        with Enumeration_Example;

        package Enumeration_Renaming is

           subtype Day is Enumeration_Example.Day;

           function Monday    return Day renames Enumeration_Example.Mon;
           function Tuesday   return Day renames Enumeration_Example.Tue;
           function Wednesday return Day renames Enumeration_Example.Wed;
           function Thursday  return Day renames Enumeration_Example.Thu;
           function Friday    return Day renames Enumeration_Example.Fri;
           function Saturday  return Day renames Enumeration_Example.Sat;
           function Sunday    return Day renames Enumeration_Example.Sun;

        end Enumeration_Renaming;

        with Ada.Text_IO;          use Ada.Text_IO;
        with Enumeration_Renaming; use Enumeration_Renaming;

        procedure Show_Renaming is
           D1 : constant Day := Monday;
        begin
           Put_Line (Day'Image (D1));
        end Show_Renaming;

    Note that the call to :ada:`Put_Line` still display ``Mon`` instead of
    ``Monday``.

Enumeration overloading
~~~~~~~~~~~~~~~~~~~~~~~

Enumerations can be overloaded. In simple terms, this means that the same name
can be used to declare an enumeration of different types. A typical example is
the declaration of colors:

.. code:: ada compile_button project=Courses.Advanced_Ada.Types.Enumeration_Overloading

    package Colors is

       type Color is
         (Salmon,
          Firebrick,
          Red,
          Darkred,
          Lime,
          Forestgreen,
          Green,
          Darkgreen,
          Blue,
          Mediumblue,
          Darkblue);

       type Primary_Color is
         (Red,
          Green,
          Blue);

    end Colors;

Note that we have :ada:`Red` as an enumeration of type :ada:`Color` and of type
:ada:`Primary_Color`. The same applies to :ada:`Green` and :ada:`Blue`. Because
Ada is a strongly-typed language, in most cases, the enumeration that we're
referring to is clear from the context. For example:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Overloading

    with Ada.Text_IO; use Ada.Text_IO;
    with Colors;      use Colors;

    procedure Red_Colors is
       C1 : constant Color         := Red;   --  Using Red from Color
       C2 : constant Primary_Color := Red;   --  Using Red from Primary_Color
    begin
       if C1 = Red then
          Put_Line ("C1 = Red");
       end if;
       if C2 = Red then
          Put_Line ("C2 = Red");
       end if;
    end Red_Colors;

When assigning :ada:`Red` to :ada:`C1` and :ada:`C2`, it is clear that, in the
first case, we're referring to :ada:`Red` of :ada:`Color` type, while in the
second case, we're referring to :ada:`Red` of the :ada:`Primary_Color` type.
The same logic applies to comparisons such as the one in
:ada:`if C1 = Red`: because the type of :ada:`C1` is defined
(:ada:`Color`), it's clear that the :ada:`Red` enumeration is the one of
:ada:`Color` type.

Enumeration subtypes
^^^^^^^^^^^^^^^^^^^^

Note that enumeration overloading is not the same as enumeration subtypes. For
example, we could define the following subtype:

.. code:: ada no_button project=Courses.Advanced_Ada.Types.Enumeration_Overloading

    package Colors.Shades is

       subtype Blue_Shades is Colors range Blue .. Darkblue;

    end Colors.Shades;

In this case, :ada:`Blue` of :ada:`Blue_Shades` and :ada:`Blue` of
:ada:`Colors` are the same enumeration.

Enumeration ambiguities
^^^^^^^^^^^^^^^^^^^^^^^

A situation where enumeration overloading might lead to ambiguities is when we
use them in ranges. For example:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Ambiguities
    :class: ada-expect-compile-error

    package Colors is

       type Color is
         (Salmon,
          Firebrick,
          Red,
          Darkred,
          Lime,
          Forestgreen,
          Green,
          Darkgreen,
          Blue,
          Mediumblue,
          Darkblue);

       type Primary_Color is
         (Red,
          Green,
          Blue);

    end Colors;

    with Ada.Text_IO; use Ada.Text_IO;
    with Colors;      use Colors;

    procedure Color_Loop is
    begin
       for C in Red .. Blue loop       --  ERROR: range is ambiguous!
          Put_Line (Color'Image (C));
       end loop;
    end Color_Loop;

Here, it's not clear whether the range in the loop is of :ada:`Color` type or
of :ada:`Primary_Color` type. Therefore, we get a compilation error for this
code example. The next line in the code example |mdash| the one with the call
to :ada:`Put_Line` |mdash| gives us a hint about the developer's intention to
refer to the :ada:`Color` type. In this case, we can use qualification |mdash|
for example, :ada:`Color'(Red)` |mdash| to resolve the ambiguity:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Ambiguities

    with Ada.Text_IO; use Ada.Text_IO;
    with Colors;      use Colors;

    procedure Color_Loop is
    begin
       for C in Color'(Red) .. Color'(Blue) loop
          Put_Line (Color'Image (C));
       end loop;
    end Color_Loop;

Note that, in the case of ranges, we can also rewrite the loop by using a range
declaration:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Ambiguities

    with Ada.Text_IO; use Ada.Text_IO;
    with Colors;      use Colors;

    procedure Color_Loop is
    begin
       for C in Color range Red .. Blue loop
          Put_Line (Color'Image (C));
       end loop;
    end Color_Loop;

Alternatively, :ada:`Color range Red .. Blue` could be used in a subtype
declaration, so we could rewrite the example above using a subtype (such as
:ada:`Red_To_Blue`) in the loop:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Ambiguities

    with Ada.Text_IO; use Ada.Text_IO;
    with Colors;      use Colors;

    procedure Color_Loop is
       subtype Red_To_Blue is Color range Red .. Blue;
    begin
       for C in Red_To_Blue loop
          Put_Line (Color'Image (C));
       end loop;
    end Color_Loop;

Enumeration representation clauses
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

As we've said above, a typical Ada compiler doesn't generate function calls for
code that deals with enumerations. On the contrary, each enumeration has values
associated with it, and the compiler uses those values instead.

Each enumeration has:

- a position value, which is a natural value indicating the position of the
  enumeration in the enumeration type; and

- an internal code, which, by default, in most cases, is the same as the
  position value.

Also, by default, the value of the first position is zero, the value of the
second position is one, and so on. We can see this by listing each enumeration
of the :ada:`Day` type and displaying the value of the corresponding position:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Values

    package Days is

       type Day is (Mon, Tue, Wed, Thu, Fri, Sat, Sun);

    end Days;

    with Ada.Text_IO; use Ada.Text_IO;
    with Days;        use Days;

    procedure Show_Days is
    begin
       for D in Day loop
          Put_Line (Day'Image (D) & " position      = "
                    & Integer'Image (Day'Pos (D)));
          Put_Line (Day'Image (D) & " internal code = "
                    & Integer'Image (Day'Enum_Rep (D)));
       end loop;
    end Show_Days;

Note that this application also displays the internal code, which, in this
case, is equivalent to the position value for all enumerations.

We may, however, change the internal code of an enumeration using a
representation clause, which has the following format:

.. code-block:: ada

    for Primary_Color is (Red   =>    1,
                          Green =>    5,
                          Blue  => 1000);

The value of each code in a representation clause must be distinct. However, as
you can see above, we don't need to use sequential values |mdash| the values
must, however, increase for each enumeration.

We can rewrite the previous example using a representation clause:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Enumeration_Values

    package Days is

       type Day is (Mon, Tue, Wed, Thu, Fri, Sat, Sun);

       for Day use (Mon => 2#00000001#, Tue => 2#00000010#,
                    Wed => 2#00000100#, Thu => 2#00001000#,
                    Fri => 2#00010000#, Sat => 2#00100000#,
                    Sun => 2#01000000#);

    end Days;

    with Ada.Text_IO; use Ada.Text_IO;
    with Days;        use Days;

    procedure Show_Days is
    begin
       for D in Day loop
          Put_Line (Day'Image (D) & " position      = "
                    & Integer'Image (Day'Pos (D)));
          Put_Line (Day'Image (D) & " internal code = "
                    & Integer'Image (Day'Enum_Rep (D)));
       end loop;
    end Show_Days;

Now, the value of the internal code is the one that we've specified in the
representation clause instead of being equivalent to the value of the
enumeration position.

In the example above, we're using binary values for each enumeration |mdash|
basically viewing the integer value as a bit-field and assigning one bit for
each enumeration. As long as we maintain an increasing order, we can use
totally arbitrary values as well. For example:

.. code:: ada compile_button project=Courses.Advanced_Ada.Types.Enumeration_Values

    package Days is

       type Day is (Mon, Tue, Wed, Thu, Fri, Sat, Sun);

       for Day use (Mon =>  5, Tue =>  9,
                    Wed => 42, Thu => 49,
                    Fri => 50, Sat => 66,
                    Sun => 99);

    end Days;

.. _Definite_Indefinite_Subtypes:

Definite and Indefinite Subtypes
--------------------------------

Indefinite types were mentioned back in the
:doc:`Introduction to Ada course <courses/intro-to-ada/chapters/more_about_types>`.
In this section, we'll recapitulate and extend on both definite and indefinite
types.

Definite types are the basic kind of types we commonly use when programming
applications. For example, we can only declare variables of definite types;
otherwise, we get a compilation error. Interestingly, however, to be able to
explain what definite types are, we need to first discuss indefinite types.

Indefinite types include:

- unconstrained arrays;

- record types with unconstrained discriminants without defaults.

Let's see some examples of indefinite types:

.. code:: ada compile_button project=Courses.Advanced_Ada.Types.Indefinite_Types

    package Unconstrained_Types is

       type Integer_Array is array (Positive range <>) of Integer;

       type Simple_Record (Extended : Boolean) is record
          V : Integer;
          case Extended is
             when False =>
                null;
             when True  =>
                V_Float : Float;
          end case;
       end record;

    end Unconstrained_Types;

As we've just mentioned, we cannot declare variable of indefinite types:

.. code:: ada compile_button project=Courses.Advanced_Ada.Types.Indefinite_Types
    :class: ada-expect-compile-error

    with Unconstrained_Types; use Unconstrained_Types;

    procedure Using_Unconstrained_Type is

       A : Integer_Array;

       R : Simple_Record;

    begin
       null;
    end Using_Unconstrained_Type;

As we can see when we try to build this example, the compiler complains about
the declaration of :ada:`A` and :ada:`R` because we're trying to use indefinite
types to declare variables. The main reason we cannot use indefinite types here
is that the compiler needs to know at this point how much memory it should
allocate. Therefore, we need to provide the information that is missing. In
other words, we need to change the declaration so the type becomes definite. We
can do this by either declaring a definite type or providing constraints in the
variable declaration. For example:

.. code:: ada compile_button project=Courses.Advanced_Ada.Types.Indefinite_Types

    with Unconstrained_Types; use Unconstrained_Types;

    procedure Using_Unconstrained_Type is

       subtype Integer_Array_5 is Integer_Array (1 .. 5);

       A1 : Integer_Array_5;
       A2 : Integer_Array (1 .. 5);

       subtype Simple_Record_Ext is Simple_Record (Extended => True);

       R1 : Simple_Record_Ext;
       R2 : Simple_Record (Extended => True);

    begin
       null;
    end Using_Unconstrained_Type;

In this example, we declare the :ada:`Integer_Array_5` subtype, which is
definite because we're constraining it to a range from 1 to 5, thereby
defining the information that was missing in the indefinite type
:ada:`Integer_Array`. Because we now have a definite type, we can use it to
declare the :ada:`A1` variable. Similarly, we can use the indefinite type
:ada:`Integer_Array` directly in the declaration of :ada:`A2` by specifying the
previously unknown range.

Similarly, in this example, we declare the :ada:`Simple_Record_Ext` subtype,
which is definite because we're initializing the record discriminant
:ada:`Extended`. We can therefore use it in the declaration of the :ada:`R1`
variable. Alternatively, we can simply use the indefinite type
:ada:`Simple_Record` and specify the information required for the
discriminants. This is what we do in the declaration of the :ada:`R2` variable.

Although we cannot use indefinite types directly in variable declarations,
they're very useful to generalize algorithms. For example, we can use them as
parameters of a subprogram:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Indefinite_Types

    with Unconstrained_Types; use Unconstrained_Types;

    procedure Show_Integer_Array (A : Integer_Array);

    with Ada.Text_IO;         use Ada.Text_IO;

    procedure Show_Integer_Array (A : Integer_Array) is
    begin
       for I in A'Range loop
          Put_Line (Positive'Image (I) & ": " & Integer'Image (A (I)));
       end loop;
       Put_Line ("--------");
    end Show_Integer_Array;

    with Unconstrained_Types; use Unconstrained_Types;
    with Show_Integer_Array;

    procedure Using_Unconstrained_Type is
       A_5  : constant Integer_Array (1 .. 5)  := (1, 2, 3, 4, 5);
       A_10 : constant Integer_Array (1 .. 10) := (1, 2, 3, 4, 5, others => 99);
    begin
       Show_Integer_Array (A_5);
       Show_Integer_Array (A_10);
    end Using_Unconstrained_Type;

In this particular example, the compiler doesn't know a priori which range is
used for the :ada:`A` parameter of :ada:`Show_Integer_Array`. It could be a
range from 1 to 5 as used for variable :ada:`A_5` of the
:ada:`Using_Unconstrained_Type` procedure, or it could be a range from 1 to 10
as used for variable :ada:`A_10`, or it could be anything else. Although the
parameter :ada:`A` of :ada:`Show_Integer_Array` is unconstrained, both calls to
:ada:`Show_Integer_Array` |mdash| in :ada:`Using_Unconstrained_Type` procedure
|mdash| use constrained objects.

Note that we could call the :ada:`Show_Integer_Array` procedure above with
another unconstrained parameter. For example:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Indefinite_Types

    with Unconstrained_Types; use Unconstrained_Types;

    procedure Show_Integer_Array_With_Header (AA : Integer_Array;
                                              HH : String);

    with Ada.Text_IO;         use Ada.Text_IO;
    with Show_Integer_Array;

    procedure Show_Integer_Array_With_Header (AA : Integer_Array;
                                              HH : String) is
    begin
       Put_Line (HH);
       Show_Integer_Array (AA);
    end Show_Integer_Array_With_Header;

    with Unconstrained_Types;            use Unconstrained_Types;
    with Show_Integer_Array_With_Header;

    procedure Using_Unconstrained_Type is
       A_5  : constant Integer_Array (1 .. 5)  := (1, 2, 3, 4, 5);
       A_10 : constant Integer_Array (1 .. 10) := (1, 2, 3, 4, 5, others => 99);
    begin
       Show_Integer_Array_With_Header (A_5, "First example");
       Show_Integer_Array_With_Header (A_10, "Second example");
    end Using_Unconstrained_Type;

In this case, we're calling the :ada:`Show_Integer_Array` procedure with
another unconstrained parameter (the :ada:`AA` parameter). However, although we
could have a long *chain* of procedure calls using indefinite types in their
parameters, we still use a (definite) object at the beginning of this chain.
For example, for the :ada:`A_5` object, we have this chain:

::

    A_5

        ==> Show_Integer_Array_With_Header (AA => A_5, ...);

            ==> Show_Integer_Array (A => AA);

Therefore, at this specific call to :ada:`Show_Integer_Array`, even though
:ada:`A` is declared as a parameter of indefinite type, the actual argument
is of definite type because :ada:`A_5` is constrained |mdash| and, thus, of
definite type.

Note that we can declare variables based on parameters of indefinite type. For
example:

.. code:: ada run_button project=Courses.Advanced_Ada.Types.Indefinite_Types

    with Unconstrained_Types; use Unconstrained_Types;

    procedure Show_Integer_Array_Plus (A : Integer_Array;
                                       V : Integer);

    with Show_Integer_Array;

    procedure Show_Integer_Array_Plus (A : Integer_Array;
                                       V : Integer) is
       A_Plus : Integer_Array (A'Range);
    begin
       for I in A_Plus'Range loop
          A_Plus (I) := A (I) + V;
       end loop;
       Show_Integer_Array (A_Plus);
    end Show_Integer_Array_Plus;

    with Unconstrained_Types; use Unconstrained_Types;
    with Show_Integer_Array_Plus;

    procedure Using_Unconstrained_Type is
       A_5 : constant Integer_Array (1 .. 5) := (1, 2, 3, 4, 5);
    begin
       Show_Integer_Array_Plus (A_5, 5);
    end Using_Unconstrained_Type;

In the :ada:`Show_Integer_Array_Plus` procedure, we're declaring :ada:`A_Plus`
based on the range of :ada:`A`, which is itself of indefinite type. However,
since the object passed as an argument to :ada:`Show_Integer_Array_Plus` must
have a constraint, :ada:`A_Plus` will also be constrained. For example, in the
call to :ada:`Show_Integer_Array_Plus` using :ada:`A_5` as an argument, the
declaration of :ada:`A_Plus` becomes :ada:`A_Plus : Integer_Array (1 .. 5);`.
Therefore, it becomes clear that the compiler needs to allocate five elements
for :ada:`A_Plus`.

We'll see later how definite and indefinite types apply to
:ref:`formal parameters <Formal_Definite_Indefinite_Subtypes>`.

Incomplete types
----------------

.. todo::

    Complete section!


Mutually dependent types
------------------------

.. todo::

    Complete section!


Type view
---------

.. todo::

    Complete section!


Default initial conditions
--------------------------

.. admonition:: Relevant topics

    - `Default Initial Conditions <http://www.ada-auth.org/standards/2xrm/html/RM-7-3-3.html>`_

.. todo::

    Complete section!


..
    REMOVED! TO BE RE-EVALUATED IN 2022:

    Stable Properties of a Type
    ---------------------------

    .. admonition:: Relevant topics

        - `Stable Properties of a Type <http://www.ada-auth.org/standards/2xrm/html/RM-7-3-4.html>`_


Deferred Constants
------------------

.. admonition:: Relevant topics

    - `Deferred Constants <http://www.ada-auth.org/standards/2xrm/html/RM-7-4.html>`_

.. todo::

    Complete section!


User-defined literals
---------------------

.. admonition:: Relevant topics

    - `User-Defined Literals <http://www.ada-auth.org/standards/2xrm/html/RM-4-2-1.html>`_

.. todo::

    Complete section!


Data Representation
-------------------

.. note::

    This section was originally written by Robert Dewar and published as
    `Gem #27: Changing Data Representation <https://www.adacore.com/gems/gem-27>`_
    and `Gem #28 <https://www.adacore.com/gems/gem-28>`_.

.. admonition:: Relevant topics

    - Include: ``Object_Size``, ``Value_Size``, ``Alignment``, ``T'Base``
    - `Operational and Representation Attributes <http://www.ada-auth.org/standards/2xrm/html/RM-13-3.html>`_
    - `Packed Types <http://www.ada-auth.org/standards/2xrm/html/RM-13-2.html>`_
    - `Bit Ordering <http://www.ada-auth.org/standards/2xrm/html/RM-13-5-3.html>`_
    - `At Clauses <http://www.ada-auth.org/standards/2xrm/html/RM-J-7.html>`_

.. todo::

    Complete section!


Record Representation and storage clauses
-----------------------------------------

.. admonition:: Relevant topics

    - **Briefly** discuss record representation and storage clauses
    - `Record Representation Clauses <http://www.ada-auth.org/standards/2xrm/html/RM-13-5-1.html>`_
    - `Storage Place Attributes <http://www.ada-auth.org/standards/2xrm/html/RM-13-5-2.html>`_
    - `Mod Clauses <http://www.ada-auth.org/standards/2xrm/html/RM-J-8.html>`_

.. todo::

    Complete section!


Valid
-----

.. admonition:: Relevant topics

    - `The Valid Attribute <http://www.ada-auth.org/standards/2xrm/html/RM-13-9-2.html>`_

.. todo::

    Complete section!


Unchecked Union
---------------

.. admonition:: Relevant topics

    - **Briefly** discuss unchecked unions, as mentioned in
      `Unchecked Union Types <http://www.ada-auth.org/standards/2xrm/html/RM-B-3-3.html>`_

.. todo::

    Complete section!


Variable control
----------------

.. admonition:: Relevant topics

    - **Briefly** discuss :ada:`Atomic`, :ada:`Volatile`, etc
    - `Shared Variable Control <http://www.ada-auth.org/standards/2xrm/html/RM-C-6.html>`_
    - `The Package System.Atomic_Operations <http://www.ada-auth.org/standards/2xrm/html/RM-C-6-1.html>`_

.. todo::

    Complete section!


..
    REMOVED! TO BE RE-EVALUATED IN 2022:

    Discarding names
    ----------------

    .. admonition:: Relevant topics

        - **Briefly** discuss discarding name mentioned in
        `Aspect Discard_Names <http://www.ada-auth.org/standards/2xrm/html/RM-C-5.html>`_
