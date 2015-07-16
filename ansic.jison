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
		{ throw("Unimplemented rule for primary_expression: " + yytext); }
	| CONSTANT
		{ throw("Unimplemented rule for primary_expression: " + yytext); }
	| STRING_LITERAL
		{ throw("Unimplemented rule for primary_expression: " + yytext); }
	| '(' expression ')'
		{ throw("Unimplemented rule for primary_expression: " + yytext); }
	;

postfix_expression
	: primary_expression
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression '[' expression ']'
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression '(' ')'
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression '(' argument_expression_list ')'
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression '.' IDENTIFIER
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression PTR_OP IDENTIFIER
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression INC_OP
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression DEC_OP
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	;

argument_expression_list
	: assignment_expression
		{ throw("Unimplemented rule for argument_expression_list: " + yytext); }
	| argument_expression_list ',' assignment_expression
		{ throw("Unimplemented rule for argument_expression_list: " + yytext); }
	;

unary_expression
	: postfix_expression
		{ throw("Unimplemented rule for unary_expression: " + yytext); }
	| INC_OP unary_expression
		{ throw("Unimplemented rule for unary_expression: " + yytext); }
	| DEC_OP unary_expression
		{ throw("Unimplemented rule for unary_expression: " + yytext); }
	| unary_operator cast_expression
		{ throw("Unimplemented rule for unary_expression: " + yytext); }
	| SIZEOF unary_expression
		{ throw("Unimplemented rule for unary_expression: " + yytext); }
	| SIZEOF '(' type_name ')'
		{ throw("Unimplemented rule for unary_expression: " + yytext); }
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
		{ throw("Unimplemented rule for cast_expression: " + yytext); }
	| '(' type_name ')' cast_expression
		{ throw("Unimplemented rule for cast_expression: " + yytext); }
	;

multiplicative_expression
	: cast_expression
		{ throw("Unimplemented rule for multiplicative_expression: " + yytext); }
	| multiplicative_expression '*' cast_expression
		{ throw("Unimplemented rule for multiplicative_expression: " + yytext); }
	| multiplicative_expression '/' cast_expression
		{ throw("Unimplemented rule for multiplicative_expression: " + yytext); }
	| multiplicative_expression '%' cast_expression
		{ throw("Unimplemented rule for multiplicative_expression: " + yytext); }
	;

additive_expression
	: multiplicative_expression
		{ throw("Unimplemented rule for additive_expression: " + yytext); }
	| additive_expression '+' multiplicative_expression
		{ throw("Unimplemented rule for additive_expression: " + yytext); }
	| additive_expression '-' multiplicative_expression
		{ throw("Unimplemented rule for additive_expression: " + yytext); }
	;

shift_expression
	: additive_expression
		{ throw("Unimplemented rule for shift_expression: " + yytext); }
	| shift_expression LEFT_OP additive_expression
		{ throw("Unimplemented rule for shift_expression: " + yytext); }
	| shift_expression RIGHT_OP additive_expression
		{ throw("Unimplemented rule for shift_expression: " + yytext); }
	;

relational_expression
	: shift_expression
		{ throw("Unimplemented rule for relational_expression: " + yytext); }
	| relational_expression '<' shift_expression
		{ throw("Unimplemented rule for relational_expression: " + yytext); }
	| relational_expression '>' shift_expression
		{ throw("Unimplemented rule for relational_expression: " + yytext); }
	| relational_expression LE_OP shift_expression
		{ throw("Unimplemented rule for relational_expression: " + yytext); }
	| relational_expression GE_OP shift_expression
		{ throw("Unimplemented rule for relational_expression: " + yytext); }
	;

equality_expression
	: relational_expression
		{ throw("Unimplemented rule for equality_expression: " + yytext); }
	| equality_expression EQ_OP relational_expression
		{ throw("Unimplemented rule for equality_expression: " + yytext); }
	| equality_expression NE_OP relational_expression
		{ throw("Unimplemented rule for equality_expression: " + yytext); }
	;

and_expression
	: equality_expression
		{ throw("Unimplemented rule for and_expression: " + yytext); }
	| and_expression '&' equality_expression
		{ throw("Unimplemented rule for and_expression: " + yytext); }
	;

exclusive_or_expression
	: and_expression
		{ throw("Unimplemented rule for exclusive_or_expression: " + yytext); }
	| exclusive_or_expression '^' and_expression
		{ throw("Unimplemented rule for exclusive_or_expression: " + yytext); }
	;

inclusive_or_expression
	: exclusive_or_expression
		{ throw("Unimplemented rule for inclusive_or_expression: " + yytext); }
	| inclusive_or_expression '|' exclusive_or_expression
		{ throw("Unimplemented rule for inclusive_or_expression: " + yytext); }
	;

logical_and_expression
	: inclusive_or_expression
		{ throw("Unimplemented rule for logical_and_expression: " + yytext); }
	| logical_and_expression AND_OP inclusive_or_expression
		{ throw("Unimplemented rule for logical_and_expression: " + yytext); }
	;

logical_or_expression
	: logical_and_expression
		{ throw("Unimplemented rule for logical_or_expression: " + yytext); }
	| logical_or_expression OR_OP logical_and_expression
		{ throw("Unimplemented rule for logical_or_expression: " + yytext); }
	;

conditional_expression
	: logical_or_expression
		{ throw("Unimplemented rule for conditional_expression: " + yytext); }
	| logical_or_expression '?' expression ':' conditional_expression
		{ throw("Unimplemented rule for conditional_expression: " + yytext); }
	;

assignment_expression
	: conditional_expression
		{ throw("Unimplemented rule for assignment_expression: " + yytext); }
	| unary_expression assignment_operator assignment_expression
		{ throw("Unimplemented rule for assignment_expression: " + yytext); }
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
		{ throw("Unimplemented rule for expression: " + yytext); }
	| expression ',' assignment_expression
		{ throw("Unimplemented rule for expression: " + yytext); }
	;

constant_expression
	: conditional_expression
		{ throw("Unimplemented rule for constant_expression: " + yytext); }
	;

declaration
	: declaration_specifiers ';'
		{ throw("Unimplemented rule for declaration: " + yytext); }
	| declaration_specifiers init_declarator_list ';'
		{ throw("Unimplemented rule for declaration: " + yytext); }
	;

declaration_specifiers
	: storage_class_specifier
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| storage_class_specifier declaration_specifiers
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| type_specifier
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| type_specifier declaration_specifiers
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| type_qualifier
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| type_qualifier declaration_specifiers
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	;

init_declarator_list
	: init_declarator
		{ throw("Unimplemented rule for init_declarator_list: " + yytext); }
	| init_declarator_list ',' init_declarator
		{ throw("Unimplemented rule for init_declarator_list: " + yytext); }
	;

init_declarator
	: declarator
		{ throw("Unimplemented rule for init_declarator: " + yytext); }
	| declarator '=' initializer
		{ throw("Unimplemented rule for init_declarator: " + yytext); }
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
	| CHAR
	| SHORT
	| INT
	| LONG
	| FLOAT
	| DOUBLE
	| SIGNED
	| UNSIGNED
	| struct_or_union_specifier
	| enum_specifier
	| TYPE_NAME
	;

struct_or_union_specifier
	: struct_or_union IDENTIFIER '{' struct_declaration_list '}'
		{ throw("Unimplemented rule for struct_or_union_specifier: " + yytext); }
	| struct_or_union '{' struct_declaration_list '}'
		{ throw("Unimplemented rule for struct_or_union_specifier: " + yytext); }
	| struct_or_union IDENTIFIER
		{ throw("Unimplemented rule for struct_or_union_specifier: " + yytext); }
	;

struct_or_union
	: STRUCT
	| UNION
	;

struct_declaration_list
	: struct_declaration
		{ throw("Unimplemented rule for struct_declaration_list: " + yytext); }
	| struct_declaration_list struct_declaration
		{ throw("Unimplemented rule for struct_declaration_list: " + yytext); }
	;

struct_declaration
	: specifier_qualifier_list struct_declarator_list ';'
		{ throw("Unimplemented rule for struct_declaration: " + yytext); }
	;

specifier_qualifier_list
	: type_specifier specifier_qualifier_list
		{ throw("Unimplemented rule for specifier_qualifier_list: " + yytext); }
	| type_specifier
		{ throw("Unimplemented rule for specifier_qualifier_list: " + yytext); }
	| type_qualifier specifier_qualifier_list
		{ throw("Unimplemented rule for specifier_qualifier_list: " + yytext); }
	| type_qualifier
		{ throw("Unimplemented rule for specifier_qualifier_list: " + yytext); }
	;

struct_declarator_list
	: struct_declarator
		{ throw("Unimplemented rule for struct_declarator_list: " + yytext); }
	| struct_declarator_list ',' struct_declarator
		{ throw("Unimplemented rule for struct_declarator_list: " + yytext); }
	;

struct_declarator
	: declarator
		{ throw("Unimplemented rule for struct_declarator: " + yytext); }
	| ':' constant_expression
		{ throw("Unimplemented rule for struct_declarator: " + yytext); }
	| declarator ':' constant_expression
		{ throw("Unimplemented rule for struct_declarator: " + yytext); }
	;

enum_specifier
	: ENUM '{' enumerator_list '}'
		{ throw("Unimplemented rule for enum_specifier: " + yytext); }
	| ENUM IDENTIFIER '{' enumerator_list '}'
		{ throw("Unimplemented rule for enum_specifier: " + yytext); }
	| ENUM IDENTIFIER
		{ throw("Unimplemented rule for enum_specifier: " + yytext); }
	;

enumerator_list
	: enumerator
		{ throw("Unimplemented rule for enumerator_list: " + yytext); }
	| enumerator_list ',' enumerator
		{ throw("Unimplemented rule for enumerator_list: " + yytext); }
	;

enumerator
	: IDENTIFIER
		{ throw("Unimplemented rule for enumerator: " + yytext); }
	| IDENTIFIER '=' constant_expression
		{ throw("Unimplemented rule for enumerator: " + yytext); }
	;

type_qualifier
	: CONST
	| VOLATILE
	;

declarator
	: pointer direct_declarator
		{ throw("Unimplemented rule for declarator: " + yytext); }
	| direct_declarator
		{ throw("Unimplemented rule for declarator: " + yytext); }
	;

direct_declarator
	: IDENTIFIER
		{ throw("Unimplemented rule for direct_declarator: " + yytext); }
	| '(' declarator ')'
		{ throw("Unimplemented rule for direct_declarator: " + yytext); }
	| direct_declarator '[' constant_expression ']'
		{ throw("Unimplemented rule for direct_declarator: " + yytext); }
	| direct_declarator '[' ']'
		{ throw("Unimplemented rule for direct_declarator: " + yytext); }
	| direct_declarator '(' parameter_type_list ')'
		{ throw("Unimplemented rule for direct_declarator: " + yytext); }
	| direct_declarator '(' identifier_list ')'
		{ throw("Unimplemented rule for direct_declarator: " + yytext); }
	| direct_declarator '(' ')'
		{ throw("Unimplemented rule for direct_declarator: " + yytext); }
	;

pointer
	: '*'
		{ throw("Unimplemented rule for pointer: " + yytext); }
	| '*' type_qualifier_list
		{ throw("Unimplemented rule for pointer: " + yytext); }
	| '*' pointer
		{ throw("Unimplemented rule for pointer: " + yytext); }
	| '*' type_qualifier_list pointer
		{ throw("Unimplemented rule for pointer: " + yytext); }
	;

type_qualifier_list
	: type_qualifier
		{ throw("Unimplemented rule for type_qualifier_list: " + yytext); }
	| type_qualifier_list type_qualifier
		{ throw("Unimplemented rule for type_qualifier_list: " + yytext); }
	;


parameter_type_list
	: parameter_list
		{ throw("Unimplemented rule for parameter_type_list: " + yytext); }
	| parameter_list ',' ELLIPSIS
		{ throw("Unimplemented rule for parameter_type_list: " + yytext); }
	;

parameter_list
	: parameter_declaration
		{ throw("Unimplemented rule for parameter_list: " + yytext); }
	| parameter_list ',' parameter_declaration
		{ throw("Unimplemented rule for parameter_list: " + yytext); }
	;

parameter_declaration
	: declaration_specifiers declarator
		{ throw("Unimplemented rule for parameter_declaration: " + yytext); }
	| declaration_specifiers abstract_declarator
		{ throw("Unimplemented rule for parameter_declaration: " + yytext); }
	| declaration_specifiers
		{ throw("Unimplemented rule for parameter_declaration: " + yytext); }
	;

identifier_list
	: IDENTIFIER
		{ throw("Unimplemented rule for identifier_list: " + yytext); }
	| identifier_list ',' IDENTIFIER
		{ throw("Unimplemented rule for identifier_list: " + yytext); }
	;

type_name
	: specifier_qualifier_list
		{ throw("Unimplemented rule for type_name: " + yytext); }
	| specifier_qualifier_list abstract_declarator
		{ throw("Unimplemented rule for type_name: " + yytext); }
	;

abstract_declarator
	: pointer
		{ throw("Unimplemented rule for abstract_declarator: " + yytext); }
	| direct_abstract_declarator
		{ throw("Unimplemented rule for abstract_declarator: " + yytext); }
	| pointer direct_abstract_declarator
		{ throw("Unimplemented rule for abstract_declarator: " + yytext); }
	;

direct_abstract_declarator
	: '(' abstract_declarator ')'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| '[' ']'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| '[' constant_expression ']'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| direct_abstract_declarator '[' ']'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| direct_abstract_declarator '[' constant_expression ']'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| '(' ')'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| '(' parameter_type_list ')'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| direct_abstract_declarator '(' ')'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	| direct_abstract_declarator '(' parameter_type_list ')'
		{ throw("Unimplemented rule for direct_abstract_declarator: " + yytext); }
	;

initializer
	: assignment_expression
		{ throw("Unimplemented rule for initializer: " + yytext); }
	| '{' initializer_list '}'
		{ throw("Unimplemented rule for initializer: " + yytext); }
	| '{' initializer_list ',' '}'
		{ throw("Unimplemented rule for initializer: " + yytext); }
	;

initializer_list
	: initializer
		{ throw("Unimplemented rule for initializer_list: " + yytext); }
	| initializer_list ',' initializer
		{ throw("Unimplemented rule for initializer_list: " + yytext); }
	;

statement
	: labeled_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	| compound_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	| expression_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	| selection_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	| iteration_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	| jump_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	;

labeled_statement
	: IDENTIFIER ':' statement
		{ throw("Unimplemented rule for labeled_statement: " + yytext); }
	| CASE constant_expression ':' statement
		{ throw("Unimplemented rule for labeled_statement: " + yytext); }
	| DEFAULT ':' statement
		{ throw("Unimplemented rule for labeled_statement: " + yytext); }
	;

compound_statement
	: '{' '}'
		{ throw("Unimplemented rule for compound_statement: " + yytext); }
	| '{' statement_list '}'
		{ throw("Unimplemented rule for compound_statement: " + yytext); }
	| '{' declaration_list '}'
		{ throw("Unimplemented rule for compound_statement: " + yytext); }
	| '{' declaration_list statement_list '}'
		{ throw("Unimplemented rule for compound_statement: " + yytext); }
	;

declaration_list
	: declaration
		{ throw("Unimplemented rule for declaration_list: " + yytext); }
	| declaration_list declaration
		{ throw("Unimplemented rule for declaration_list: " + yytext); }
	;

statement_list
	: statement
		{ throw("Unimplemented rule for statement_list: " + yytext); }
	| statement_list statement
		{ throw("Unimplemented rule for statement_list: " + yytext); }
	;

expression_statement
	: ';'
		{ throw("Unimplemented rule for expression_statement: " + yytext); }
	| expression ';'
		{ throw("Unimplemented rule for expression_statement: " + yytext); }
	;

selection_statement
	: IF '(' expression ')' statement %prec IF_WITHOUT_ELSE
		{ throw("Unimplemented rule for selection_statement: " + yytext); }
	| IF '(' expression ')' statement ELSE statement
		{ throw("Unimplemented rule for selection_statement: " + yytext); }
	| SWITCH '(' expression ')' statement
		{ throw("Unimplemented rule for selection_statement: " + yytext); }
	;

iteration_statement
	: WHILE '(' expression ')' statement
		{ throw("Unimplemented rule for iteration_statement: " + yytext); }
	| DO statement WHILE '(' expression ')' ';'
		{ throw("Unimplemented rule for iteration_statement: " + yytext); }
	| FOR '(' expression_statement expression_statement ')' statement
		{ throw("Unimplemented rule for iteration_statement: " + yytext); }
	| FOR '(' expression_statement expression_statement expression ')' statement
		{ throw("Unimplemented rule for iteration_statement: " + yytext); }
	;

jump_statement
	: GOTO IDENTIFIER ';'
		{ throw("Unimplemented rule for jump_statement: " + yytext); }
	| CONTINUE ';'
		{ throw("Unimplemented rule for jump_statement: " + yytext); }
	| BREAK ';'
		{ throw("Unimplemented rule for jump_statement: " + yytext); }
	| RETURN ';'
		{ throw("Unimplemented rule for jump_statement: " + yytext); }
	| RETURN expression ';'
		{ throw("Unimplemented rule for jump_statement: " + yytext); }
	;

translation_unit
	: external_declaration
		{ throw("Unimplemented rule for translation_unit: " + yytext); }
	| translation_unit external_declaration
		{ throw("Unimplemented rule for translation_unit: " + yytext); }
	;

external_declaration
	: function_definition
		{ throw("Unimplemented rule for external_declaration: " + yytext); }
	| declaration
		{ throw("Unimplemented rule for external_declaration: " + yytext); }
	;

function_definition
	: declaration_specifiers declarator declaration_list compound_statement
		{ throw("Unimplemented rule for function_definition: " + yytext); }
	| declaration_specifiers declarator compound_statement
		{ throw("Unimplemented rule for function_definition: " + yytext); }
	| declarator declaration_list compound_statement
		{ throw("Unimplemented rule for function_definition: " + yytext); }
	| declarator compound_statement
		{ throw("Unimplemented rule for function_definition: " + yytext); }
	;

root
	: translation_unit
	{ return $$; }
	;
