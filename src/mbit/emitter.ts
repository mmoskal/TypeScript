/// <reference path="../compiler/tsc.ts"/>

/* @internal */
namespace ts {
    export function inspect(n: Node) {
        var k = (<any>ts).SyntaxKind[n.kind]
        console.log(k)
    }

    export function emitMBit(program: Program): EmitResult {

        const diagnostics = createDiagnosticCollection();


        program.getSourceFiles().forEach(emitNode);

        return {
            diagnostics: diagnostics.getDiagnostics(),
            emitSkipped: false,
            sourceMaps: []
        }

        function error(node: Node, msg: string, arg0?: any, arg1?: any, arg2?: any) {
            diagnostics.add(createDiagnosticForNode(node, {
                code: 9042,
                message: msg,
                key: msg.replace(/^[a-zA-Z]+/g, "_"),
                category: DiagnosticCategory.Error,
            }, arg0, arg1, arg2));
        }

        function emitIdentifier(node: Identifier) { }
        function emitParameter(node: ParameterDeclaration) { }
        function emitMethod(node: MethodDeclaration) { }
        function emitAccessor(node: AccessorDeclaration) { }
        function emitThis(node: Node) { }
        function emitSuper(node: Node) { }
        function emitLiteral(node: LiteralExpression) { }
        function emitTemplateExpression(node: TemplateExpression) { }
        function emitTemplateSpan(node: TemplateSpan) { }
        function emitJsxElement(node: JsxElement) { }
        function emitJsxSelfClosingElement(node: JsxSelfClosingElement) { }
        function emitJsxText(node: JsxText) { }
        function emitJsxExpression(node: JsxExpression) { }
        function emitQualifiedName(node: QualifiedName) { }
        function emitObjectBindingPattern(node: BindingPattern) { }
        function emitArrayBindingPattern(node: BindingPattern) { }
        function emitBindingElement(node: BindingElement) { }
        function emitArrayLiteral(node: ArrayLiteralExpression) { }
        function emitObjectLiteral(node: ObjectLiteralExpression) { }
        function emitPropertyAssignment(node: PropertyDeclaration) { }
        function emitShorthandPropertyAssignment(node: ShorthandPropertyAssignment) { }
        function emitComputedPropertyName(node: ComputedPropertyName) { }
        function emitPropertyAccess(node: PropertyAccessExpression) { }
        function emitIndexedAccess(node: ElementAccessExpression) { }
        function emitCallExpression(node: CallExpression) { }
        function emitNewExpression(node: NewExpression) { }
        function emitTaggedTemplateExpression(node: TaggedTemplateExpression) { }
        function emitTypeAssertion(node: TypeAssertion) { }
        function emitAsExpression(node: AsExpression) { }
        function emitParenExpression(node: ParenthesizedExpression) { }
        function emitFunctionDeclaration(node: FunctionLikeDeclaration) { }
        function emitDeleteExpression(node: DeleteExpression) { }
        function emitTypeOfExpression(node: TypeOfExpression) { }
        function emitVoidExpression(node: VoidExpression) { }
        function emitAwaitExpression(node: AwaitExpression) { }
        function emitPrefixUnaryExpression(node: PrefixUnaryExpression) { }
        function emitPostfixUnaryExpression(node: PostfixUnaryExpression) { }
        function emitBinaryExpression(node: BinaryExpression) { }
        function emitConditionalExpression(node: ConditionalExpression) { }
        function emitSpreadElementExpression(node: SpreadElementExpression) { }
        function emitYieldExpression(node: YieldExpression) { }
        function emitBlock(node: Block) { }
        function emitVariableStatement(node: VariableStatement) { }
        function emitExpressionStatement(node: ExpressionStatement) { }
        function emitIfStatement(node: IfStatement) { }
        function emitDoStatement(node: DoStatement) { }
        function emitWhileStatement(node: WhileStatement) { }
        function emitForStatement(node: ForStatement) { }
        function emitForInOrForOfStatement(node: ForInStatement) { }
        function emitBreakOrContinueStatement(node: BreakOrContinueStatement) { }
        function emitReturnStatement(node: ReturnStatement) { }
        function emitWithStatement(node: WithStatement) { }
        function emitSwitchStatement(node: SwitchStatement) { }
        function emitCaseOrDefaultClause(node: CaseOrDefaultClause) { }
        function emitLabeledStatement(node: LabeledStatement) { }
        function emitThrowStatement(node: ThrowStatement) { }
        function emitTryStatement(node: TryStatement) { }
        function emitCatchClause(node: CatchClause) { }
        function emitDebuggerStatement(node: Node) { }
        function emitVariableDeclaration(node: VariableDeclaration) { }
        function emitClassExpression(node: ClassExpression) { }
        function emitClassDeclaration(node: ClassDeclaration) { }
        function emitInterfaceDeclaration(node: InterfaceDeclaration) { }
        function emitEnumDeclaration(node: EnumDeclaration) { }
        function emitEnumMember(node: EnumMember) { }
        function emitModuleDeclaration(node: ModuleDeclaration) { }
        function emitImportDeclaration(node: ImportDeclaration) { }
        function emitImportEqualsDeclaration(node: ImportEqualsDeclaration) { }
        function emitExportDeclaration(node: ExportDeclaration) { }
        function emitExportAssignment(node: ExportAssignment) { }
        function emitSourceFileNode(node: SourceFile) { 
            node.statements.forEach(emitNode)
        }

        function emitIntLiteral(n: number) {

        }

        function emitNode(node: Node) {
            emitNodeCore(node);
        }

        function emitNodeCore(node: Node) {
            // Check if the node can be emitted regardless of the ScriptTarget
            switch (node.kind) {
                case SyntaxKind.SourceFile:
                    return emitSourceFileNode(<SourceFile>node);

                case SyntaxKind.NullKeyword:
                    return emitIntLiteral(0);
                case SyntaxKind.TrueKeyword:
                    return emitIntLiteral(1);
                case SyntaxKind.FalseKeyword:
                    return emitIntLiteral(0);

                default:
                    error(node, "Unsupported syntax node: {0}", (<any>ts).SyntaxKind[node.kind]);

                /*    
                case SyntaxKind.Identifier:
                    return emitIdentifier(<Identifier>node);
                case SyntaxKind.Parameter:
                    return emitParameter(<ParameterDeclaration>node);
                case SyntaxKind.MethodDeclaration:
                case SyntaxKind.MethodSignature:
                    return emitMethod(<MethodDeclaration>node);
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                    return emitAccessor(<AccessorDeclaration>node);
                case SyntaxKind.ThisKeyword:
                    return emitThis(node);
                case SyntaxKind.SuperKeyword:
                    return emitSuper(node);
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.StringLiteral:
                case SyntaxKind.RegularExpressionLiteral:
                case SyntaxKind.NoSubstitutionTemplateLiteral:
                case SyntaxKind.TemplateHead:
                case SyntaxKind.TemplateMiddle:
                case SyntaxKind.TemplateTail:
                    return emitLiteral(<LiteralExpression>node);
                case SyntaxKind.TemplateExpression:
                    return emitTemplateExpression(<TemplateExpression>node);
                case SyntaxKind.TemplateSpan:
                    return emitTemplateSpan(<TemplateSpan>node);
                case SyntaxKind.JsxElement:
                    return emitJsxElement(<JsxElement>node);
                case SyntaxKind.JsxSelfClosingElement:
                    return emitJsxSelfClosingElement(<JsxSelfClosingElement>node);
                case SyntaxKind.JsxText:
                    return emitJsxText(<JsxText>node);
                case SyntaxKind.JsxExpression:
                    return emitJsxExpression(<JsxExpression>node);
                case SyntaxKind.QualifiedName:
                    return emitQualifiedName(<QualifiedName>node);
                case SyntaxKind.ObjectBindingPattern:
                    return emitObjectBindingPattern(<BindingPattern>node);
                case SyntaxKind.ArrayBindingPattern:
                    return emitArrayBindingPattern(<BindingPattern>node);
                case SyntaxKind.BindingElement:
                    return emitBindingElement(<BindingElement>node);
                case SyntaxKind.ArrayLiteralExpression:
                    return emitArrayLiteral(<ArrayLiteralExpression>node);
                case SyntaxKind.ObjectLiteralExpression:
                    return emitObjectLiteral(<ObjectLiteralExpression>node);
                case SyntaxKind.PropertyAssignment:
                    return emitPropertyAssignment(<PropertyDeclaration>node);
                case SyntaxKind.ShorthandPropertyAssignment:
                    return emitShorthandPropertyAssignment(<ShorthandPropertyAssignment>node);
                case SyntaxKind.ComputedPropertyName:
                    return emitComputedPropertyName(<ComputedPropertyName>node);
                case SyntaxKind.PropertyAccessExpression:
                    return emitPropertyAccess(<PropertyAccessExpression>node);
                case SyntaxKind.ElementAccessExpression:
                    return emitIndexedAccess(<ElementAccessExpression>node);
                case SyntaxKind.CallExpression:
                    return emitCallExpression(<CallExpression>node);
                case SyntaxKind.NewExpression:
                    return emitNewExpression(<NewExpression>node);
                case SyntaxKind.TaggedTemplateExpression:
                    return emitTaggedTemplateExpression(<TaggedTemplateExpression>node);
                case SyntaxKind.TypeAssertionExpression:
                    return emitTypeAssertion(<TypeAssertion>node);
                case SyntaxKind.AsExpression:
                    return emitAsExpression(<AsExpression>node);
                case SyntaxKind.ParenthesizedExpression:
                    return emitParenExpression(<ParenthesizedExpression>node);
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.FunctionExpression:
                case SyntaxKind.ArrowFunction:
                    return emitFunctionDeclaration(<FunctionLikeDeclaration>node);
                case SyntaxKind.DeleteExpression:
                    return emitDeleteExpression(<DeleteExpression>node);
                case SyntaxKind.TypeOfExpression:
                    return emitTypeOfExpression(<TypeOfExpression>node);
                case SyntaxKind.VoidExpression:
                    return emitVoidExpression(<VoidExpression>node);
                case SyntaxKind.AwaitExpression:
                    return emitAwaitExpression(<AwaitExpression>node);
                case SyntaxKind.PrefixUnaryExpression:
                    return emitPrefixUnaryExpression(<PrefixUnaryExpression>node);
                case SyntaxKind.PostfixUnaryExpression:
                    return emitPostfixUnaryExpression(<PostfixUnaryExpression>node);
                case SyntaxKind.BinaryExpression:
                    return emitBinaryExpression(<BinaryExpression>node);
                case SyntaxKind.ConditionalExpression:
                    return emitConditionalExpression(<ConditionalExpression>node);
                case SyntaxKind.SpreadElementExpression:
                    return emitSpreadElementExpression(<SpreadElementExpression>node);
                case SyntaxKind.YieldExpression:
                    return emitYieldExpression(<YieldExpression>node);
                case SyntaxKind.OmittedExpression:
                    return;
                case SyntaxKind.Block:
                case SyntaxKind.ModuleBlock:
                    return emitBlock(<Block>node);
                case SyntaxKind.VariableStatement:
                    return emitVariableStatement(<VariableStatement>node);
                case SyntaxKind.EmptyStatement:
                    return;
                case SyntaxKind.ExpressionStatement:
                    return emitExpressionStatement(<ExpressionStatement>node);
                case SyntaxKind.IfStatement:
                    return emitIfStatement(<IfStatement>node);
                case SyntaxKind.DoStatement:
                    return emitDoStatement(<DoStatement>node);
                case SyntaxKind.WhileStatement:
                    return emitWhileStatement(<WhileStatement>node);
                case SyntaxKind.ForStatement:
                    return emitForStatement(<ForStatement>node);
                case SyntaxKind.ForOfStatement:
                case SyntaxKind.ForInStatement:
                    return emitForInOrForOfStatement(<ForInStatement>node);
                case SyntaxKind.ContinueStatement:
                case SyntaxKind.BreakStatement:
                    return emitBreakOrContinueStatement(<BreakOrContinueStatement>node);
                case SyntaxKind.ReturnStatement:
                    return emitReturnStatement(<ReturnStatement>node);
                case SyntaxKind.WithStatement:
                    return emitWithStatement(<WithStatement>node);
                case SyntaxKind.SwitchStatement:
                    return emitSwitchStatement(<SwitchStatement>node);
                case SyntaxKind.CaseClause:
                case SyntaxKind.DefaultClause:
                    return emitCaseOrDefaultClause(<CaseOrDefaultClause>node);
                case SyntaxKind.LabeledStatement:
                    return emitLabeledStatement(<LabeledStatement>node);
                case SyntaxKind.ThrowStatement:
                    return emitThrowStatement(<ThrowStatement>node);
                case SyntaxKind.TryStatement:
                    return emitTryStatement(<TryStatement>node);
                case SyntaxKind.CatchClause:
                    return emitCatchClause(<CatchClause>node);
                case SyntaxKind.DebuggerStatement:
                    return emitDebuggerStatement(node);
                case SyntaxKind.VariableDeclaration:
                    return emitVariableDeclaration(<VariableDeclaration>node);
                case SyntaxKind.ClassExpression:
                    return emitClassExpression(<ClassExpression>node);
                case SyntaxKind.ClassDeclaration:
                    return emitClassDeclaration(<ClassDeclaration>node);
                case SyntaxKind.InterfaceDeclaration:
                    return emitInterfaceDeclaration(<InterfaceDeclaration>node);
                case SyntaxKind.EnumDeclaration:
                    return emitEnumDeclaration(<EnumDeclaration>node);
                case SyntaxKind.EnumMember:
                    return emitEnumMember(<EnumMember>node);
                case SyntaxKind.ModuleDeclaration:
                    return emitModuleDeclaration(<ModuleDeclaration>node);
                case SyntaxKind.ImportDeclaration:
                    return emitImportDeclaration(<ImportDeclaration>node);
                case SyntaxKind.ImportEqualsDeclaration:
                    return emitImportEqualsDeclaration(<ImportEqualsDeclaration>node);
                case SyntaxKind.ExportDeclaration:
                    return emitExportDeclaration(<ExportDeclaration>node);
                case SyntaxKind.ExportAssignment:
                    return emitExportAssignment(<ExportAssignment>node);
                */
            }
        }
    }
}
