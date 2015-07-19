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
		{ throw("Unimplemented rule for primary_expression: " + yytext); }
	| '(' expression ')'
		{ throw("Unimplemented rule for primary_expression: " + yytext); }
	;

postfix_expression
	: primary_expression
	| postfix_expression '[' expression ']'
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression '(' ')'
		{ throw("Unimplemented rule for postfix_expression: " + yytext); }
	| postfix_expression '(' argument_expression_list ')'
		{ $$ = new yy.Node('FunctionCall', [$1, $3]); }
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
		{ $$ = [$1]; }
	| argument_expression_list ',' assignment_expression
		{ $$ = $1; $$.push($3); }
	;

unary_expression
	: postfix_expression
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
	| '(' type_name ')' cast_expression
		{ throw("Unimplemented rule for cast_expression: " + yytext); }
	;

multiplicative_expression
	: cast_expression
	| multiplicative_expression '*' cast_expression
		{ throw("Unimplemented rule for multiplicative_expression: " + yytext); }
	| multiplicative_expression '/' cast_expression
		{ throw("Unimplemented rule for multiplicative_expression: " + yytext); }
	| multiplicative_expression '%' cast_expression
		{ throw("Unimplemented rule for multiplicative_expression: " + yytext); }
	;

additive_expression
	: multiplicative_expression
	| additive_expression '+' multiplicative_expression
		{ $$ = new yy.Node('Add', [$1, $3]); }
	| additive_expression '-' multiplicative_expression
		{ throw("Unimplemented rule for additive_expression: " + yytext); }
	;

shift_expression
	: additive_expression
	| shift_expression LEFT_OP additive_expression
		{ throw("Unimplemented rule for shift_expression: " + yytext); }
	| shift_expression RIGHT_OP additive_expression
		{ throw("Unimplemented rule for shift_expression: " + yytext); }
	;

relational_expression
	: shift_expression
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
	| equality_expression EQ_OP relational_expression
		{ throw("Unimplemented rule for equality_expression: " + yytext); }
	| equality_expression NE_OP relational_expression
		{ throw("Unimplemented rule for equality_expression: " + yytext); }
	;

and_expression
	: equality_expression
	| and_expression '&' equality_expression
		{ throw("Unimplemented rule for and_expression: " + yytext); }
	;

exclusive_or_expression
	: and_expression
	| exclusive_or_expression '^' and_expression
		{ throw("Unimplemented rule for exclusive_or_expression: " + yytext); }
	;

inclusive_or_expression
	: exclusive_or_expression
	| inclusive_or_expression '|' exclusive_or_expression
		{ throw("Unimplemented rule for inclusive_or_expression: " + yytext); }
	;

logical_and_expression
	: inclusive_or_expression
	| logical_and_expression AND_OP inclusive_or_expression
		{ throw("Unimplemented rule for logical_and_expression: " + yytext); }
	;

logical_or_expression
	: logical_and_expression
	| logical_or_expression OR_OP logical_and_expression
		{ throw("Unimplemented rule for logical_or_expression: " + yytext); }
	;

conditional_expression
	: logical_or_expression
	| logical_or_expression '?' expression ':' conditional_expression
		{ throw("Unimplemented rule for conditional_expression: " + yytext); }
	;

assignment_expression
	: conditional_expression
	| unary_expression assignment_operator assignment_expression
		{ $$ = new yy.Node('Assign', [$1, $2, $3]); }
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
		{ $$ = new yy.Node('Declaration', [$1, $2]); }
	;

declaration_specifiers
	: storage_class_specifier
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| storage_class_specifier declaration_specifiers
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| type_specifier
		{ $$ = [$1]; }
	| type_specifier declaration_specifiers
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| type_qualifier
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	| type_qualifier declaration_specifiers
		{ throw("Unimplemented rule for declaration_specifiers: " + yytext); }
	;

init_declarator_list
	: init_declarator
		{ $$ = [$1]; }
	| init_declarator_list ',' init_declarator
		{ throw("Unimplemented rule for init_declarator_list: " + yytext); }
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
	;

direct_declarator
	: IDENTIFIER
		{ $$ = new yy.Node('Identifier', [$1]); }
	| '(' declarator ')'
		{ throw("Unimplemented rule 1 for direct_declarator: " + yytext); }
	| direct_declarator '[' constant_expression ']'
		{ throw("Unimplemented rule 2 for direct_declarator: " + yytext); }
	| direct_declarator '[' ']'
		{ throw("Unimplemented rule 3 for direct_declarator: " + yytext); }
	| direct_declarator '(' parameter_type_list ')'
		{ $$ = new yy.Node('FunctionDeclarator', [$1, $3]); }
	| direct_declarator '(' identifier_list ')'
		{ throw("Unimplemented rule 5 for direct_declarator: " + yytext); }
	| direct_declarator '(' ')'
		{ throw("Unimplemented rule 6 for direct_declarator: " + yytext); }
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
	| parameter_list ',' ELLIPSIS
		{ throw("Unimplemented rule for parameter_type_list: " + yytext); }
	;

parameter_list
	: parameter_declaration
		{ $$ = [$1]; }
	| parameter_list ',' parameter_declaration
		{ $$ = $1; $$.push($3); }
	;

parameter_declaration
	: declaration_specifiers declarator
		{ $$ = new yy.Node('ParameterDeclaration', [$1, $2]); }
	| declaration_specifiers abstract_declarator
		{ throw("Unimplemented rule for parameter_declaration: " + yytext); }
	| declaration_specifiers
		{ $$ = new yy.Node('TypeOnlyParameterDeclaration', [$1]); }
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
	| selection_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	| iteration_statement
		{ throw("Unimplemented rule for statement: " + yytext); }
	| jump_statement
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
		{ $$ = new yy.Node('Block', [[], $2]); }
	| '{' declaration_list '}'
		{ throw("Unimplemented rule for compound_statement: " + yytext); }
	| '{' declaration_list statement_list '}'
		{ $$ = new yy.Node('Block', [$2, $3]); }
	;

declaration_list
	: declaration
		{ $$ = [$1]; }
	| declaration_list declaration
		{ throw("Unimplemented rule for declaration_list: " + yytext); }
	;

statement_list
	: statement
		{ $$ = [$1]; }
	| statement_list statement
		{ $$ = $1; $$.push($2); }
	;

expression_statement
	: ';'
		{ throw("Unimplemented rule for expression_statement: " + yytext); }
	| expression ';'
		{ $$ = new yy.Node('ExpressionStatement', [$1]); }
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
		{ $$ = new yy.Node('Return', [$2]); }
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
		{ throw("Unimplemented rule for external_declaration: " + yytext); }
	;

function_definition
	: declaration_specifiers declarator declaration_list compound_statement
		{ throw("Unimplemented rule for function_definition: " + yytext); }
	| declaration_specifiers declarator compound_statement
		{ $$ = new yy.Node('FunctionDefinition', [$1, $2, [], $3]); }
	| declarator declaration_list compound_statement
		{ throw("Unimplemented rule for function_definition: " + yytext); }
	| declarator compound_statement
		{ throw("Unimplemented rule for function_definition: " + yytext); }
	;

root
	: translation_unit
	{ return $$; }
	;
