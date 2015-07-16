%token IDENTIFIER CONSTANT STRING_LITERAL SIZEOF
%token PTR_OP INC_OP DEC_OP LEFT_OP RIGHT_OP LE_OP GE_OP EQ_OP NE_OP
%token AND_OP OR_OP MUL_ASSIGN DIV_ASSIGN MOD_ASSIGN ADD_ASSIGN
%token SUB_ASSIGN LEFT_ASSIGN RIGHT_ASSIGN AND_ASSIGN
%token XOR_ASSIGN OR_ASSIGN TYPE_NAME

%token TYPEDEF EXTERN STATIC AUTO REGISTER
%token CHAR SHORT INT LONG SIGNED UNSIGNED FLOAT DOUBLE CONST VOLATILE VOID
%token STRUCT UNION ENUM ELLIPSIS

%token CASE DEFAULT IF ELSE SWITCH WHILE DO FOR GOTO CONTINUE BREAK RETURN

%nonassoc IF_WITHOUT_ELSE
%nonassoc ELSE

%start root
%%

primary_expression
	: IDENTIFIER
		{ $$ = new yy.Node('Var', [$1]); }
	| CONSTANT
		{ $$ = new yy.Node('Const', [$1]); }
	| STRING_LITERAL
		{ $$ = new yy.Node('String', [$1]); }
	| '(' expression ')'
		{ $$ = $2 }
	;

postfix_expression
	: primary_expression
	| postfix_expression '[' expression ']'
		{ $$ = new yy.Node('ArraySubscript', [$1, $3]); }
	| postfix_expression '(' ')'
		{ $$ = new yy.Node('Call', [$1, []]); }
	| postfix_expression '(' argument_expression_list ')'
		{ $$ = new yy.Node('Call', [$1, $3]); }
	| postfix_expression '.' IDENTIFIER
		{ $$ = new yy.Node('MemberAccess', [$1, $3]); }
	| postfix_expression PTR_OP IDENTIFIER
		{ $$ = new yy.Node('PtrAccess', [$1, $3]); }
	| postfix_expression INC_OP
		{ $$ = new yy.Node('Postincrement', [$1]); }
	| postfix_expression DEC_OP
		{ $$ = new yy.Node('Postdecrement', [$1]); }
	;

argument_expression_list
	: assignment_expression
		{ $$ = [$1]; }
	| argument_expression_list ',' assignment_expression
		{ $$ = $1; $$.push($3); }
	;

unary_expression
	: postfix_expression
	| INC_OP unary_expression
		{ $$ = new yy.Node('Preincrement', [$2]); }
	| DEC_OP unary_expression
		{ $$ = new yy.Node('Postincrement', [$2]); }
	| unary_operator cast_expression
		{ $$ = new yy.Node('Unary', [$1, $2]); }
	| SIZEOF unary_expression
		{ $$ = new yy.Node('SizeofExpr', [$2]); }
	| SIZEOF '(' type_name ')'
		{ $$ = new yy.Node('SizeofType', [$3]); }
	;

unary_operator
	: '&'
	| '*'
	| '+'
	| '-'
	| '~'
	| '!'
	;

cast_expression
	: unary_expression
	| '(' type_name ')' cast_expression
		{ $$ = new yy.Node('Cast', [$2, $4]); }
	;

multiplicative_expression
	: cast_expression
	| multiplicative_expression '*' cast_expression
		{ $$ = new yy.Node('Mul', [$1, $3]); }
	| multiplicative_expression '/' cast_expression
		{ $$ = new yy.Node('Div', [$1, $3]); }
	| multiplicative_expression '%' cast_expression
		{ $$ = new yy.Node('Mod', [$1, $3]); }
	;

additive_expression
	: multiplicative_expression
	| additive_expression '+' multiplicative_expression
		{ $$ = new yy.Node('Add', [$1, $3]); }
	| additive_expression '-' multiplicative_expression
		{ $$ = new yy.Node('Sub', [$1, $3]); }
	;

shift_expression
	: additive_expression
	| shift_expression LEFT_OP additive_expression
		{ $$ = new yy.Node('Lshift', [$1, $3]); }
	| shift_expression RIGHT_OP additive_expression
		{ $$ = new yy.Node('Rshift', [$1, $3]); }
	;

relational_expression
	: shift_expression
	| relational_expression '<' shift_expression
		{ $$ = new yy.Node('LT', [$1, $3]); }
	| relational_expression '>' shift_expression
		{ $$ = new yy.Node('GT', [$1, $3]); }
	| relational_expression LE_OP shift_expression
		{ $$ = new yy.Node('LTE', [$1, $3]); }
	| relational_expression GE_OP shift_expression
		{ $$ = new yy.Node('GTE', [$1, $3]); }
	;

equality_expression
	: relational_expression
	| equality_expression EQ_OP relational_expression
		{ $$ = new yy.Node('EQ', [$1, $3]); }
	| equality_expression NE_OP relational_expression
		{ $$ = new yy.Node('NE', [$1, $3]); }
	;

and_expression
	: equality_expression
	| and_expression '&' equality_expression
		{ $$ = new yy.Node('BinaryAnd', [$1, $3]); }
	;

exclusive_or_expression
	: and_expression
	| exclusive_or_expression '^' and_expression
		{ $$ = new yy.Node('BinaryXor', [$1, $3]); }
	;

inclusive_or_expression
	: exclusive_or_expression
	| inclusive_or_expression '|' exclusive_or_expression
		{ $$ = new yy.Node('BinaryOr', [$1, $3]); }
	;

logical_and_expression
	: inclusive_or_expression
	| logical_and_expression AND_OP inclusive_or_expression
		{ $$ = new yy.Node('LogicalAnd', [$1, $3]); }
	;

logical_or_expression
	: logical_and_expression
	| logical_or_expression OR_OP logical_and_expression
		{ $$ = new yy.Node('LogicalOr', [$1, $3]); }
	;

conditional_expression
	: logical_or_expression
	| logical_or_expression '?' expression ':' conditional_expression
		{ $$ = new yy.Node('Conditional', [$1, $3, $5]); }
	;

assignment_expression
	: conditional_expression
	| unary_expression assignment_operator assignment_expression
		{ $$ = new yy.Node('Assign', [$2, $1, $3]); }
	;

assignment_operator
	: '='
	| MUL_ASSIGN
	| DIV_ASSIGN
	| MOD_ASSIGN
	| ADD_ASSIGN
	| SUB_ASSIGN
	| LEFT_ASSIGN
	| RIGHT_ASSIGN
	| AND_ASSIGN
	| XOR_ASSIGN
	| OR_ASSIGN
	;

expression
	: assignment_expression
	| expression ',' assignment_expression
		{{ $$ = new yy.Node('Comma', [$1, $3]); }}
	;

constant_expression
	: conditional_expression
	;

declaration
	: declaration_specifiers ';'
		{ $$ = new yy.Node('Declare', [$1, []]); }
	| declaration_specifiers init_declarator_list ';'
		{ $$ = new yy.Node('Declare', [$1, $2]); }
	;

declaration_specifiers
	: storage_class_specifier
		{ $$ = new yy.Node('TypeDeclaration', [[$1], [], []]); }
	| storage_class_specifier declaration_specifiers
		{ $$ = $2; $$.params[0].unshift($1); }
	| type_specifier
		{ $$ = new yy.Node('TypeDeclaration', [[], [$1], []]); }
	| type_specifier declaration_specifiers
		{ $$ = $2; $$.params[1].unshift($1); }
	| type_qualifier
		{ $$ = new yy.Node('TypeDeclaration', [[], [], [$1]]); }
	| type_qualifier declaration_specifiers
		{ $$ = $2; $$.params[2].unshift($1); }
	;

init_declarator_list
	: init_declarator
		{ $$ = [$1]; }
	| init_declarator_list ',' init_declarator
		{ $$ = $1; $$.push($3); }
	;

init_declarator
	: declarator
		{ $$ = new yy.Node('InitDeclarator', [$1, null]); }
	| declarator '=' initializer
		{ $$ = new yy.Node('InitDeclarator', [$1, $3]); }
	;

storage_class_specifier
	: TYPEDEF
	| EXTERN
	| STATIC
	| AUTO
	| REGISTER
	;

type_specifier
	: VOID
		{ $$ = new yy.Node('Void', []); }
	| CHAR
		{ $$ = new yy.Node('Char', []); }
	| SHORT
		{ $$ = new yy.Node('Short', []); }
	| INT
		{ $$ = new yy.Node('Int', []); }
	| LONG
		{ $$ = new yy.Node('Long', []); }
	| FLOAT
		{ $$ = new yy.Node('Float', []); }
	| DOUBLE
		{ $$ = new yy.Node('Double', []); }
	| SIGNED
		{ $$ = new yy.Node('Signed', []); }
	| UNSIGNED
		{ $$ = new yy.Node('Unsigned', []); }
	| struct_or_union_specifier
	| enum_specifier
	| TYPE_NAME
	;

struct_or_union_specifier
	: struct_or_union IDENTIFIER '{' struct_declaration_list '}'
		{ $$ = new yy.Node($1, [$2, $4]); }
	| struct_or_union '{' struct_declaration_list '}'
		{ $$ = new yy.Node($1, [null, $3]); }
	| struct_or_union IDENTIFIER
		{ $$ = new yy.Node($1, [$2, null]); }
	;

struct_or_union
	: STRUCT
		{ $$ = 'Struct'; }}
	| UNION
		{ $$ = 'Union'; }}
	;

struct_declaration_list
	: struct_declaration
		{ $$ = [$1]; }
	| struct_declaration_list struct_declaration
		{ $$ = $1; $$.push($2); }
	;

struct_declaration
	: specifier_qualifier_list struct_declarator_list ';'
		{ $$ = new yy.Node('StructDeclaration', [$1, $2]); }
	;

specifier_qualifier_list
	: type_specifier specifier_qualifier_list
		{ $$ = $2; $$.params[1].unshift($1); }
	| type_specifier
		{ $$ = new yy.Node('TypeDeclaration', [[], [$1], []]); }
	| type_qualifier specifier_qualifier_list
		{ $$ = $2; $$.params[2].unshift($1); }
	| type_qualifier
		{ $$ = new yy.Node('TypeDeclaration', [[], [], [$1]]); }
	;

struct_declarator_list
	: struct_declarator
		{ $$ = [$1]; }
	| struct_declarator_list ',' struct_declarator
		{ $$ = $1; $$.push($3); }
	;

struct_declarator
	: declarator
		{ $$ = new yy.Node('StructDeclarator', [$1, null]); }
	| ':' constant_expression
		{ $$ = new yy.Node('StructDeclarator', [null, $2]); }
	| declarator ':' constant_expression
		{ $$ = new yy.Node('StructDeclarator', [$1, $3]); }
	;

enum_specifier
	: ENUM '{' enumerator_list '}'
		{ $$ = new yy.Node('Enum', ['', $3]); }
	| ENUM IDENTIFIER '{' enumerator_list '}'
		{ $$ = new yy.Node('Enum', [$2, $4]); }
	| ENUM IDENTIFIER
		{ $$ = new yy.Node('Enum', [$2, null]); }
	;

enumerator_list
	: enumerator
		{ $$ = [$1]; }
	| enumerator_list ',' enumerator
		{ $$ = $1; $$.push($3); }
	;

enumerator
	: IDENTIFIER
		{ $$ = new yy.Node('Enumerator', [$1, null]); }
	| IDENTIFIER '=' constant_expression
		{ $$ = new yy.Node('Enumerator', [$1, $3]); }
	;

type_qualifier
	: CONST
	| VOLATILE
	;

declarator
	: pointer direct_declarator
		{ $$ = new yy.Node('Pointer', [$2]); }
	| direct_declarator
	;

direct_declarator
	: IDENTIFIER
		{ $$ = new yy.Node('Ident', [$1]); }
	| '(' declarator ')'
		{ $$ = $2; }
	| direct_declarator '[' constant_expression ']'
		{ $$ = new yy.Node('Array', [$1, $3]); }
	| direct_declarator '[' ']'
		{ $$ = new yy.Node('Array', [$1, null]); }
	| direct_declarator '(' parameter_type_list ')'
	| direct_declarator '(' identifier_list ')'
	| direct_declarator '(' ')'
	;

pointer
	: '*'
	| '*' type_qualifier_list
	| '*' pointer
	| '*' type_qualifier_list pointer
	;

type_qualifier_list
	: type_qualifier
		{ $$ = [$1]; }
	| type_qualifier_list type_qualifier
		{ $$ = $1; $$.push($2); }
	;


parameter_type_list
	: parameter_list
	| parameter_list ',' ELLIPSIS
	;

parameter_list
	: parameter_declaration
		{ $$ = [$1]; }
	| parameter_list ',' parameter_declaration
		{ $$ = $1; $$.push($3); }
	;

parameter_declaration
	: declaration_specifiers declarator
	| declaration_specifiers abstract_declarator
	| declaration_specifiers
	;

identifier_list
	: IDENTIFIER
		{ $$ = [$1]; }
	| identifier_list ',' IDENTIFIER
		{ $$ = $1; $$.push($3); }
	;

type_name
	: specifier_qualifier_list
	| specifier_qualifier_list abstract_declarator
	;

abstract_declarator
	: pointer
	| direct_abstract_declarator
	| pointer direct_abstract_declarator
	;

direct_abstract_declarator
	: '(' abstract_declarator ')'
		{ $$ = $2; }
	| '[' ']'
	| '[' constant_expression ']'
	| direct_abstract_declarator '[' ']'
	| direct_abstract_declarator '[' constant_expression ']'
	| '(' ')'
	| '(' parameter_type_list ')'
	| direct_abstract_declarator '(' ')'
	| direct_abstract_declarator '(' parameter_type_list ')'
	;

initializer
	: assignment_expression
	| '{' initializer_list '}'
	| '{' initializer_list ',' '}'
	;

initializer_list
	: initializer
	| initializer_list ',' initializer
	;

statement
	: labeled_statement
	| compound_statement
	| expression_statement
	| selection_statement
	| iteration_statement
	| jump_statement
	;

labeled_statement
	: IDENTIFIER ':' statement
	| CASE constant_expression ':' statement
	| DEFAULT ':' statement
	;

compound_statement
	: '{' '}'
		{ $$ = new yy.Node('Block', [[], []]); }
	| '{' statement_list '}'
		{ $$ = new yy.Node('Block', [[], $2]); }
	| '{' declaration_list '}'
		{ $$ = new yy.Node('Block', [$2, []]); }
	| '{' declaration_list statement_list '}'
		{ $$ = new yy.Node('Block', [$2, $3]); }
	;

declaration_list
	: declaration
		{ $$ = [$1]; }
	| declaration_list declaration
		{ $$ = $1; $$.push($2); }
	;

statement_list
	: statement
		{ $$ = [$1]; }
	| statement_list statement
		{ $$ = $1; $$.push($2); }
	;

expression_statement
	: ';'
		{ $$ = new yy.Node('Nop', []); }
	| expression ';'
		{ $$ = new yy.Node('Expr', [$1]); }
	;

selection_statement
	: IF '(' expression ')' statement %prec IF_WITHOUT_ELSE
	| IF '(' expression ')' statement ELSE statement
	| SWITCH '(' expression ')' statement
	;

iteration_statement
	: WHILE '(' expression ')' statement
	| DO statement WHILE '(' expression ')' ';'
	| FOR '(' expression_statement expression_statement ')' statement
	| FOR '(' expression_statement expression_statement expression ')' statement
	;

jump_statement
	: GOTO IDENTIFIER ';'
	| CONTINUE ';'
	| BREAK ';'
	| RETURN ';'
		{{ $$ = new yy.Node('ReturnVoid', []); }}
	| RETURN expression ';'
		{{ $$ = new yy.Node('Return', [$2]); }}
	;

translation_unit
	: external_declaration
		{ $$ = [$1]; }
	| translation_unit external_declaration
		{ $$ = $1; $$.push($2); }
	;

external_declaration
	: function_definition
	| declaration
	;

function_definition
	: declaration_specifiers declarator declaration_list compound_statement
		{ $$ = new yy.Node('FunctionDefinition', [$1, $2, $3, $4]); }
	| declaration_specifiers declarator compound_statement
		{ $$ = new yy.Node('FunctionDefinition', [$1, $2, [], $3]); }
	| declarator declaration_list compound_statement
		{ $$ = new yy.Node('FunctionDefinition', ['void', $1, $2, $3]); }
	| declarator compound_statement
		{ $$ = new yy.Node('FunctionDefinition', ['void', $1, [], $2]); }
	;

root
	: translation_unit
	{ return $$; }
	;
