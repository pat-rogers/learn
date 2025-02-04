Shared variable control
=======================

.. include:: ../../../global.txt

Ada has built-in support for handling both volatile and atomic data. Let's
start by discussing volatile objects.

.. admonition:: In the Ada Reference Manual

    - :arm22:`C.6 Shared Variable Control <C-6>`


Volatile
--------

A :wikipedia:`volatile <Volatile_(computer_programming)>`
object can be described as an object in memory whose value may change between
two consecutive memory accesses of a process A |mdash| even if process A itself
hasn't changed the value. This situation may arise when an object in memory is
being shared by multiple threads. For example, a thread *B* may modify the
value of that object between two read accesses of a thread *A*. Another typical
example is the one of
:wikipedia:`memory-mapped I/O <Memory-mapped_I/O>`, where
the hardware might be constantly changing the value of an object in memory.

Because the value of a volatile object may be constantly changing, a compiler
cannot generate code to store the value of that object in a register and then
use the value from the register in subsequent operations. Storing into a
register is avoided because, if the value is stored there, it would be outdated
if another process had changed the volatile object in the meantime. Instead,
the compiler generates code in such a way that the process must read the value
of the volatile object from memory for each access.

Let's look at a simple example:

.. code:: ada run_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Volatile.Object_Ada

    with Ada.Text_IO; use Ada.Text_IO;

    procedure Show_Volatile_Object is
       Val : Long_Float with Volatile;
    begin
       Val := 0.0;
       for I in 0 .. 999 loop
          Val := Val + 2.0 * Long_Float (I);
       end loop;

       Put_Line ("Val: " & Long_Float'Image (Val));
    end Show_Volatile_Object;

In this example, :ada:`Val` has the :ada:`Volatile` aspect, which makes the
object volatile. We can also use the :ada:`Volatile` aspect in type
declarations. For example:

.. code:: ada run_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Volatile.Type

    package Shared_Var_Types is

       type Volatile_Long_Float is new
         Long_Float with Volatile;

    end Shared_Var_Types;

    with Ada.Text_IO;      use Ada.Text_IO;
    with Shared_Var_Types; use Shared_Var_Types;

    procedure Show_Volatile_Type is
       Val : Volatile_Long_Float;
    begin
       Val := 0.0;
       for I in 0 .. 999 loop
          Val := Val + 2.0 * Volatile_Long_Float (I);
       end loop;

       Put_Line ("Val: "
                 & Volatile_Long_Float'Image (Val));
    end Show_Volatile_Type;

Here, we're declaring a new type :ada:`Volatile_Long_Float` in the
:ada:`Shared_Var_Types` package. This type is based on the :ada:`Long_Float`
type and uses the :ada:`Volatile` aspect. Any object of this type is
automatically volatile.

In addition to that, we can declare components of an array to be volatile. In
this case, we can use the :ada:`Volatile_Components` aspect in the array
declaration. For example:

.. code:: ada run_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Volatile.Array_Components

    with Ada.Text_IO; use Ada.Text_IO;

    procedure Show_Volatile_Array_Components is
       Arr : array (1 .. 2) of Long_Float
               with Volatile_Components;
    begin
       Arr := (others => 0.0);

       for I in 0 .. 999 loop
          Arr (1) := Arr (1) +  2.0 * Long_Float (I);
          Arr (2) := Arr (2) + 10.0 * Long_Float (I);
       end loop;

       Put_Line ("Arr (1): "
                 & Long_Float'Image (Arr (1)));
       Put_Line ("Arr (2): "
                 & Long_Float'Image (Arr (2)));
    end Show_Volatile_Array_Components;

Note that it's possible to use the :ada:`Volatile` aspect for the array
declaration as well:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Volatile.Array

    package Shared_Var_Types is

    private
       Arr : array (1 .. 2) of Long_Float
               with Volatile;

    end Shared_Var_Types;

Note that, if the :ada:`Volatile` aspect is specified for an object, then the
:ada:`Volatile_Components` aspect is also specified automatically |mdash| if it
makes sense in the context, of course. In the example above, even though
:ada:`Volatile_Components` isn't specified in the declaration of the :ada:`Arr`
array , it's automatically set as well.


Independent
-----------

When you write code to access a single object in memory, you might actually be
accessing multiple objects at once. For example, when you declare types that
make use of representation clauses |mdash| as we've seen in previous sections
|mdash|, you might be accessing multiple objects that are grouped together in
a single storage unit. For example, if you have components :ada:`A` and
:ada:`B` stored in the same storage unit, you cannot update :ada:`A` without
actually writing (the same value) to :ada:`B`. Those objects aren't
independently addressable because, in order to access one of them, we have to
actually address multiple objects at once.

When an object is independently addressable, we call it an independent object.
In this case, we make sure that, when accessing that object, we won't be
simultaneously accessing another object. As a consequence, this feature limits
the way objects can be represented in memory, as we'll see next.

To indicate that an object is independent, we use the :ada:`Independent`
aspect:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Object

    package Shared_Var_Types is

       I : Integer with Independent;

    end Shared_Var_Types;

Similarly, we can use this aspect when declaring types:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Type

    package Shared_Var_Types is

       type Independent_Boolean is new Boolean
         with Independent;

       type Flags is record
          F1 : Independent_Boolean;
          F2 : Independent_Boolean;
       end record;

    end Shared_Var_Types;

In this example, we're declaring the :ada:`Independent_Boolean` type and using
it in the declaration of the :ada:`Flag` record type. Let's now derive the
:ada:`Flags` type and use a representation clause for the derived type:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Type
    :class: ada-expect-compile-error

    package Shared_Var_Types.Representation is

       type Rep_Flags is new Flags;

       for Rep_Flags use record
          F1 at 0 range 0 .. 0;
          F2 at 0 range 1 .. 1;
          --            ^  ERROR: start position of
          --                      F2 is wrong!
          --    ^          ERROR: F1 and F2 share the
          --                      same storage unit!
       end record;

    end Shared_Var_Types.Representation;

As you can see when trying to compile this example, the representation clause
that we used for :ada:`Rep_Flags` isn't following these limitations:

1. The size of each independent component must be a multiple of a storage unit.

2. The start position of each independent component must be a multiple of a
   storage unit.

For example, for architectures that have a storage unit of one byte |mdash|
such as standard desktop computers |mdash|, this means that the size and the
position of independent components must be a multiple of a byte. Let's correct
the issues in the code above by:

- setting the size of each independent component to correspond to
  :ada:`Storage_Unit` |mdash| using a range between 0 and
  :ada:`Storage_Unit - 1` |mdash|, and

- setting the start position to zero.

This is the corrected version:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Type

    with System;

    package Shared_Var_Types.Representation is

       type Rep_Flags is new Flags;

       for Rep_Flags use record
          F1 at 0 range 0 .. System.Storage_Unit - 1;
          F2 at 1 range 0 .. System.Storage_Unit - 1;
       end record;

    end Shared_Var_Types.Representation;

Note that the representation that we're now using for :ada:`Rep_Flags` is most
likely the representation that the compiler would have chosen for this data
type. We could, however, have added an empty storage unit between :ada:`F1` and
:ada:`F2` |mdash| by simply writing :ada:`F2 at 2 ...`:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Type

    with System;

    package Shared_Var_Types.Representation is

       type Rep_Flags is new Flags;

       for Rep_Flags use record
          F1 at 0 range 0 .. System.Storage_Unit - 1;
          F2 at 2 range 0 .. System.Storage_Unit - 1;
       end record;

    end Shared_Var_Types.Representation;

As long as we follow the rules for independent objects, we're still allowed to
use representation clauses that don't correspond to the one that the compiler
might select.

For arrays, we can use the :ada:`Independent_Components` aspect:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Components

    package Shared_Var_Types is

       Flags : array (1 .. 8) of Boolean
                 with Independent_Components;

    end Shared_Var_Types;

We've just seen in a previous example that some representation clauses might
not work with objects and types that have the :ada:`Independent` aspect. The
same restrictions apply when we use the :ada:`Independent_Components` aspect.
For example, this aspect prevents that array components are packed when the
:ada:`Pack` aspect is used. Let's discuss the following erroneous code example:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Packed_Independent_Components
    :class: ada-expect-compile-error

    package Shared_Var_Types is

       type Flags is
         array (Positive range <>) of Boolean
           with Independent_Components, Pack;

       F : Flags (1 .. 8) with Size => 8;

    end Shared_Var_Types;

As expected, this code doesn't compile. Here, we can have either independent
components, or packed components. We cannot have both at the same time because
packed components aren't independently addressable. The compiler warns us that
the :ada:`Pack` aspect won't have any effect on independent components. When we
use the :ada:`Size` aspect in the declaration of :ada:`F`, we confirm this
limitation. If we remove the :ada:`Size` aspect, however, the code is compiled
successfully because the compiler ignores the :ada:`Pack` aspect and allocates
a larger size for :ada:`F`:

.. code:: ada run_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Independent.Packed_Independent_Components

    package Shared_Var_Types is

       type Flags is
         array (Positive range <>) of Boolean
           with Independent_Components, Pack;

    end Shared_Var_Types;

    with Ada.Text_IO; use Ada.Text_IO;
    with System;

    with Shared_Var_Types; use Shared_Var_Types;

    procedure Show_Flags_Size is
       F : Flags (1 .. 8);
    begin
       Put_Line ("Flags'Size:      "
                 & F'Size'Image & " bits");
       Put_Line ("Flags (1)'Size:  "
                 & F (1)'Size'Image & " bits");
       Put_Line ("# storage units: "
                 & Integer'Image
                     (F'Size /
                      System.Storage_Unit));
    end Show_Flags_Size;

As you can see in the output of the application, even though we specify the
:ada:`Pack` aspect for the :ada:`Flags` type, the compiler allocates eight
storage units, one per each component of the :ada:`F` array.


.. _Adv_Ada_Shared_Variable_Control_Atomic:

Atomic
------

An atomic object is an object that only accepts atomic reads and updates. The
Ada standard specifies that "for an atomic object (including an atomic
component), all reads and updates of the object as a whole are indivisible."
In this case, the compiler must generate Assembly code in such a way that reads
and updates of an atomic object must be done in a single instruction, so that
no other instruction could execute on that same object before the read or
update completes.

.. admonition:: In other contexts

    Generally, we can say that operations are said to be atomic when they can
    be completed without interruptions. This is an important requirement when
    we're performing operations on objects in memory that are shared between
    multiple processes.

    This definition of atomicity above is used, for example, when implementing
    databases. However, for this section, we're using the term "atomic"
    differently. Here, it really means that reads and updates must be performed
    with a single Assembly instruction.

    For example, if we have a 32-bit object composed of four 8-bit bytes, the
    compiler cannot generate code to read or update the object using four 8-bit
    store / load instructions, or even two 16-bit store / load instructions.
    In this case, in order to maintain atomicity, the compiler must generate
    code using one 32-bit store / load instruction.

    Because of this strict definition, we might have objects for which the
    :ada:`Atomic` aspect cannot be specified. Lots of machines support integer
    types that are larger than the native word-sized integer. For example, a
    16-bit machine probably supports both 16-bit and 32-bit integers, but only
    16-bit integer objects can be marked as atomic |mdash| or, more generally,
    only objects that fit into at most 16 bits.

Atomicity may be important, for example, when dealing with shared hardware
registers. In fact, for certain architectures, the hardware may require that
memory-mapped registers are handled atomically. In Ada, we can use the
:ada:`Atomic` aspect to indicate that an object is atomic. This is how we can
use the aspect to declare a shared hardware register:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Atomic.Object

    with System;

    package Shared_Var_Types is

    private
       R : Integer
             with Atomic,
                  Address =>
                    System'To_Address (16#FFFF00A0#);

    end Shared_Var_Types;

Note that the :ada:`Address` aspect allows for assigning a variable to a
specific location in the memory. In this example, we're using this aspect to
specify the address of the memory-mapped register.

Later on, we talk again about the
:ref:`Address aspect <Adv_Ada_Address_Aspect>` and the GNAT-specific
:ref:`System'To_Address attribute <Adv_Ada_System_To_Address>`.

In addition to atomic objects, we can declare atomic types |mdash| similar to
what we've seen before for volatile objects. For example:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Atomic.Types

    with System;

    package Shared_Var_Types is

       type Atomic_Integer is new Integer
         with Atomic;

    private
       R : Atomic_Integer
             with Address =>
                    System'To_Address (16#FFFF00A0#);

    end Shared_Var_Types;

In this example, we're declaring the :ada:`Atomic_Integer` type, which is an
atomic type. Objects of this type |mdash| such as :ada:`R` in this example
|mdash| are automatically atomic.

We can also declare atomic array components:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Atomic.Array_Components

    package Shared_Var_Types is

    private
       Arr : array (1 .. 2) of Integer
               with Atomic_Components;

    end Shared_Var_Types;

This example shows the declaration of the :ada:`Arr` array, which has atomic
components |mdash| the atomicity of its components is indicated by the
:ada:`Atomic_Components` aspect.

Note that if an object is atomic, it is also volatile and independent. In other
words, these type declarations are equivalent:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Atomic.Volatile_Independent

    package Shared_Var_Types is

       type Atomic_Integer_1 is new Integer
         with Atomic;

       type Atomic_Integer_2 is new Integer
         with Atomic,
              Volatile,
              Independent;

    end Shared_Var_Types;

A simular rule applies to components of an array. When we use the
:ada:`Atomic_Components`, the following aspects are implied: :ada:`Volatile`,
:ada:`Volatile_Components` and :ada:`Independent_Components`. For example,
these array declarations are equivalent:

.. code:: ada compile_button project=Courses.Advanced_Ada.Data_Types.Shared_Variable_Control.Atomic.Volatile_Independent

    package Shared_Var_Types is

       Arr_1 : array (1 .. 2) of Integer
                 with Atomic_Components;

       Arr_2 : array (1 .. 2) of Integer
                 with Atomic_Components,
                      Volatile,
                      Volatile_Components,
                      Independent_Components;

    end Shared_Var_Types;


..
    TO BE DONE:

    :ada:`Full_Access_Only`
    -----------------------

    .. admonition:: Relevant topics

        - :arm22:`The Package System.Atomic_Operations <C-6-1>`

    .. todo::

        - **Briefly** discuss :ada:`Full_Access_Only`
        - Add to previous section!

..
    TO BE DONE:

    Package System.Atomic_Operations
    --------------------------------

   .. admonition:: Relevant topics

      - :arm22:`The Package System.Atomic_Operations <C-6-1>`

   .. todo::

      Add to previous section!

