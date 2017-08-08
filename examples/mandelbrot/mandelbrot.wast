(module
  (type (;0;) (func (param f64 f64) (result i32)))
  (func (;0;) (type 0) (param f64 f64) (result i32) (local i32 i32 f64 f64 i32 f64)
    i32.const 32
    set_local 2
    i32.const 0
    set_local 3
    f64.const 0
    set_local 4
    f64.const 0
    set_local 5
    block
    loop
    get_local 4
    get_local 4
    f64.mul
    get_local 5
    get_local 5
    f64.mul
    f64.add
    f64.const 4
    f64.lt
    if
    get_local 3
    get_local 2
    i32.lt_s
    i32.eqz
    i32.eqz
    set_local 6
    else
    i32.const 0
    set_local 6
    end
    get_local 6
    if
    get_local 4
    get_local 4
    f64.mul
    get_local 5
    get_local 5
    f64.mul
    f64.sub
    get_local 0
    f64.add
    set_local 7
    f64.const 2
    get_local 4
    f64.mul
    get_local 5
    f64.mul
    get_local 1
    f64.add
    set_local 5
    get_local 7
    set_local 4
    get_local 3
    i32.const 1
    i32.add
    set_local 3
    br 1
    end
    end
    end
    get_local 3
    return)
  (export "calc" (func 0))
)
