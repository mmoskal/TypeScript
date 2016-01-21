/// <reference path="../compiler/tsc.ts"/>
/// <reference path="thumb.ts"/>

/* @internal */
namespace ts {
    declare var require: any;

    function inspect(n: Node) {
        var k = (<any>ts).SyntaxKind[n.kind]
        console.log(k)
    }

    function isRefType(t: Type) {
        return !(t.flags & (TypeFlags.Number | TypeFlags.Boolean | TypeFlags.Enum))
    }

    function isGlobalVar(d: Declaration) {
        return d.kind == SyntaxKind.VariableDeclaration && d.parent.parent.kind == SyntaxKind.SourceFile;
    }

    function isLocalVar(d: Declaration) {
        return d.kind == SyntaxKind.VariableDeclaration && !isGlobalVar(d);
    }

    interface CommentAttrs {
        shim?: string;
        enumval?: string;
    }

    let lf = thumb.lf;
    let checker: TypeChecker;


    export function emitMBit(program: Program): EmitResult {

        const diagnostics = createDiagnosticCollection();
        checker = program.getTypeChecker();

        mbit.staticBytecodeInfo = require("./hexinfo.js");
        mbit.setup();

        const fs = require("fs");
        const bin = new mbit.Binary();

        let proc: mbit.Procedure = new mbit.Procedure();
        bin.addProc(proc);

        let currentSourceFile: SourceFile = null;
        let currBreakLabel = "";
        let currContinueLabel = "";

        program.getSourceFiles().forEach(emit);
        finalEmit();

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

        function userError(msg: string) {
            var e = new Error(msg);
            (<any>e).bitvmUserError = true;
            throw e;
        }

        function unhandled(n: Node) {
            userError(lf("Unsupported syntax node: {0}", (<any>ts).SyntaxKind[n.kind]));
        }

        function scope(f: () => void) {
            let prevProc = proc;
            let prevBreakLabel = currBreakLabel;
            let prevContinueLabel = currContinueLabel;
            try {
                f();
            } finally {
                proc = prevProc;
                currBreakLabel = prevBreakLabel;
                currContinueLabel = prevContinueLabel;
            }
        }

        function finalEmit() {
            if (diagnostics.getModificationCount())
                return;
            bin.serialize();
            bin.patchSrcHash();
            bin.assemble();
            const hex = bin.patchHex(false).join("\r\n") + "\r\n"
            fs.writeFileSync("microbit.asm", bin.csource)
            fs.writeFileSync("microbit.hex", hex)
        }

        function emitIdentifier(node: Identifier) {
            let decl = getDecl(node)
            if (decl && decl.kind == SyntaxKind.VariableDeclaration) {
                let l = proc.localIndex(decl)
                l.emitLoad(proc);
            } else {
                unhandled(node)
            }
        }

        function emitParameter(node: ParameterDeclaration) { }
        function emitMethod(node: MethodDeclaration) { }
        function emitAccessor(node: AccessorDeclaration) { }
        function emitThis(node: Node) { }
        function emitSuper(node: Node) { }
        function emitLiteral(node: LiteralExpression) {
            if (node.kind == SyntaxKind.NumericLiteral) {
                proc.emitInt(parseInt(node.text))
            } else if (node.kind == SyntaxKind.StringLiteral) {
                if (node.text == "") {
                    proc.emitCall("string::mkEmpty", 0)
                } else {
                    let lbl = bin.emitString(node.text)
                    proc.emitLdPtr(lbl + "meta", false);
                    proc.emitCallRaw("bitvm::stringData")
                    proc.emit("push {r0}");
                }
            } else {
                Debug.fail();
            }
        }
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
        function emitPropertyAccess(node: PropertyAccessExpression) {
            let decl = getDecl(node);
            let attrs = parseComments(decl);
            if (decl.kind == SyntaxKind.EnumMember) {
                let ev = attrs.enumval
                if (!ev)
                    userError(lf("{enumval:...} missing"))
                var inf = mbit.lookupFunc(ev)
                if (!inf)
                    userError(lf("unhandled enum value: {0}", ev))
                if (inf.type == "E")
                    proc.emitInt(inf.value)
                else if (inf.type == "F" && inf.args == 0)
                    proc.emitCall(ev, 0)
                else
                    userError(lf("not valid enum: {0}; is it procedure name?", ev))
            } else {
                unhandled(node);
            }
        }
        function emitIndexedAccess(node: ElementAccessExpression) { }
        function getDecl(node: Node): Declaration {
            if (!node) return null
            let sym = checker.getSymbolAtLocation(node)
            return sym ? sym.valueDeclaration : null
        }
        function getComments(node: Node) {
            let src = getSourceFileOfNode(node)
            let doc = getLeadingCommentRangesOfNodeFromText(node, src.text)
            let cmt = doc.map(r => src.text.slice(r.pos, r.end)).join("\n")
            return cmt;
        }
        function parseComments(node: Node): CommentAttrs {
            if (!node) return {}
            let cmt = getComments(node)
            let res = {}
            cmt.replace(/\{(\w+):([^{}]+)\}/g, (f: string, n: string, v: string) => {
                (<any>res)[n] = v;
                return ""
            })
            return res
        }
        function isRefExpr(e: Expression) {
            let tp = checker.getTypeAtLocation(e)
            return isRefType(tp)
        }
        function getMask(args: NodeArray<Expression>) {
            Debug.assert(args.length <= 8)
            var m = 0
            args.forEach((a, i) => {
                if (isRefExpr(a))
                    m |= (1 << i)
            })
            return m
        }

        function emitCallExpression(node: CallExpression) {
            node.arguments.forEach(emit)

            let decl = getDecl(node.expression)
            let attrs = parseComments(decl)

            if (decl && decl.kind == SyntaxKind.FunctionDeclaration) {
                if (attrs.shim) {
                    proc.emitCall(attrs.shim, getMask(node.arguments));
                    return;
                }
            }
            emit(node.expression);
        }
        function emitNewExpression(node: NewExpression) { }
        function emitTaggedTemplateExpression(node: TaggedTemplateExpression) { }
        function emitTypeAssertion(node: TypeAssertion) { }
        function emitAsExpression(node: AsExpression) { }
        function emitParenExpression(node: ParenthesizedExpression) { }
        function emitFunctionDeclaration(node: FunctionLikeDeclaration) {
            if (node.flags & NodeFlags.Ambient)
                return;

            scope(() => {
                proc = new mbit.Procedure();
                proc.action = node;
                bin.addProc(proc);

                proc.emit(".section code");
                proc.emitLbl(proc.label);
                proc.emit("@stackmark func");
                proc.emit("@stackmark args");
                proc.emit("push {lr}");
                proc.pushLocals();

                let ret = proc.mkLabel("actret")
                currBreakLabel = ret;

                emit(node.body);

                proc.emitLbl(ret)
                proc.stackEmpty();

                proc.emitClrs(null, true);

                /*
                var retl = a.getOutParameters()[0]

                proc.emitClrs(retl ? retl.local : null, true);

                if (retl) {
                    var li = localIndex(retl.local);
                    Util.assert(!li.isByRefLocal())
                    li.emitLoadCore(proc)
                }
                */

                proc.popLocals();
                proc.emit("pop {pc}");
                proc.emit("@stackempty func");
            })
        }

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
        function emitBlock(node: Block) {
            node.statements.forEach(emit)
        }
        function emitVariableStatement(node: VariableStatement) {
            let isGlobal = node.parent == currentSourceFile;
            if (node.flags & NodeFlags.Ambient)
                return;
            node.declarationList.declarations.forEach(emit);
        }
        function emitExpressionStatement(node: ExpressionStatement) {
            emitExprAsStmt(node.expression)
        }
        function emitIfStatement(node: IfStatement) {
            emit(node.expression)
            let elseLbl = proc.mkLabel("else")
            proc.emitJmp(elseLbl, "JMPZ")
            emit(node.thenStatement)
            let afterAll = proc.mkLabel("afterif")
            proc.emitJmp(afterAll)
            proc.emitLbl(elseLbl)
            if (node.elseStatement)
                emit(node.elseStatement)
            proc.emitLbl(afterAll)
        }
        
        function getLabels(stmt:Statement)
        {
            let id = getNodeId(stmt)
            return {
                fortop: ".fortop." + id,
                cont: ".cont." + id,
                brk: ".brk." + id
            }
        }

        function emitDoStatement(node: DoStatement) {
            let l = getLabels(node)
            proc.emitLbl(l.cont);
            emit(node.statement)
            emit(node.expression)
            proc.emitJmp(l.brk, "JMPZ");
            proc.emitJmp(l.cont);
            proc.emitLbl(l.brk);
        }

        function emitWhileStatement(node: WhileStatement) {
            let l = getLabels(node)
            proc.emitLbl(l.cont);
            emit(node.expression)
            proc.emitJmp(l.brk, "JMPZ");
            emit(node.statement)
            proc.emitJmp(l.cont);
            proc.emitLbl(l.brk);
        }

        function emitExprAsStmt(node: Expression) {
            if (!node) return;
            emit(node);
            let a = checker.getTypeAtLocation(node)
            if (!(a.flags & TypeFlags.Void))
                proc.emit("pop {r0}")
            proc.stackEmpty();
        }

        function emitForStatement(node: ForStatement) {
            if (node.initializer && node.initializer.kind == SyntaxKind.VariableDeclarationList)
                (<VariableDeclarationList>node.initializer).declarations.forEach(emit);
            else
                emitExprAsStmt(<Expression>node.initializer);
            let l = getLabels(node)
            proc.emitLbl(l.fortop);
            if (node.condition) {
                emit(node.condition);
                proc.emitJmp(l.brk, "JMPZ");
            }
            emit(node.statement)
            proc.emitLbl(l.cont);
            emitExprAsStmt(node.incrementor);
            proc.emitJmp(l.fortop);
            proc.emitLbl(l.brk);
        }

        function emitForInOrForOfStatement(node: ForInStatement) { }

        function emitBreakOrContinueStatement(node: BreakOrContinueStatement) {
            let label = node.label ? node.label.text : null
            function findOuter(node: Node): Statement {
                if (!node) return null;
                if (label && node.kind == SyntaxKind.LabeledStatement &&
                    (<LabeledStatement>node).label.text == label)
                    return (<LabeledStatement>node).statement;
                if (!label && isIterationStatement(node, false))
                    return <Statement>node;
                findOuter(node.parent);
            }
            let stmt = findOuter(node)
            if (!stmt)
                error(node, lf("cannot find outer loop"))
            else {
                let l = getLabels(stmt)
                if (node.kind == SyntaxKind.ContinueStatement) {
                    if (!isIterationStatement(stmt, false))
                        error(node, lf("continue on non-loop"));
                    else proc.emitJmp(l.cont)
                } else if (node.kind == SyntaxKind.BreakStatement) {
                    proc.emitJmp(l.brk)
                } else {
                    Debug.fail();
                }
            }
        }

        function emitReturnStatement(node: ReturnStatement) { }
        function emitWithStatement(node: WithStatement) { }
        function emitSwitchStatement(node: SwitchStatement) { }
        function emitCaseOrDefaultClause(node: CaseOrDefaultClause) { }
        function emitLabeledStatement(node: LabeledStatement) {
            let l = getLabels(node.statement)
            emit(node.statement)
            proc.emitLbl(l.brk)
        }
        function emitThrowStatement(node: ThrowStatement) { }
        function emitTryStatement(node: TryStatement) { }
        function emitCatchClause(node: CatchClause) { }
        function emitDebuggerStatement(node: Node) { }
        function emitVariableDeclaration(node: VariableDeclaration) {
            let loc = proc.mkLocal(node)
            if (node.initializer) {
                emit(node.initializer)
                loc.emitStore(proc)
            }
        }
        function emitClassExpression(node: ClassExpression) { }
        function emitClassDeclaration(node: ClassDeclaration) { }
        function emitInterfaceDeclaration(node: InterfaceDeclaration) {
            // TODO?
        }
        function emitEnumDeclaration(node: EnumDeclaration) { }
        function emitEnumMember(node: EnumMember) { }
        function emitModuleDeclaration(node: ModuleDeclaration) {
            if (node.flags & NodeFlags.Ambient)
                return;
            unhandled(node);
        }
        function emitImportDeclaration(node: ImportDeclaration) { }
        function emitImportEqualsDeclaration(node: ImportEqualsDeclaration) { }
        function emitExportDeclaration(node: ExportDeclaration) { }
        function emitExportAssignment(node: ExportAssignment) { }
        function emitSourceFileNode(node: SourceFile) {
            currentSourceFile = node;
            node.statements.forEach(emit)
        }

        function emitIntLiteral(n: number) {
            proc.emitInt(n)
        }

        function emit(node: Node) {
            try {
                emitNodeCore(node);
            } catch (e) {
                if (e.bitvmUserError) {
                    error(node, e.message)
                } else {
                    throw e;
                }
            }
        }

        function emitNodeCore(node: Node) {
            switch (node.kind) {
                case SyntaxKind.SourceFile:
                    return emitSourceFileNode(<SourceFile>node);
                case SyntaxKind.NullKeyword:
                    return emitIntLiteral(0);
                case SyntaxKind.TrueKeyword:
                    return emitIntLiteral(1);
                case SyntaxKind.FalseKeyword:
                    return emitIntLiteral(0);
                case SyntaxKind.InterfaceDeclaration:
                    return emitInterfaceDeclaration(<InterfaceDeclaration>node);
                case SyntaxKind.VariableStatement:
                    return emitVariableStatement(<VariableStatement>node);
                case SyntaxKind.ModuleDeclaration:
                    return emitModuleDeclaration(<ModuleDeclaration>node);
                case SyntaxKind.EnumDeclaration:
                    return emitEnumDeclaration(<EnumDeclaration>node);
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.FunctionExpression:
                case SyntaxKind.ArrowFunction:
                    return emitFunctionDeclaration(<FunctionLikeDeclaration>node);
                case SyntaxKind.ExpressionStatement:
                    return emitExpressionStatement(<ExpressionStatement>node);
                case SyntaxKind.CallExpression:
                    return emitCallExpression(<CallExpression>node);
                case SyntaxKind.Block:
                case SyntaxKind.ModuleBlock:
                    return emitBlock(<Block>node);
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.StringLiteral:
                    //case SyntaxKind.RegularExpressionLiteral:
                    //case SyntaxKind.NoSubstitutionTemplateLiteral:
                    //case SyntaxKind.TemplateHead:
                    //case SyntaxKind.TemplateMiddle:
                    //case SyntaxKind.TemplateTail:
                    return emitLiteral(<LiteralExpression>node);
                case SyntaxKind.PropertyAccessExpression:
                    return emitPropertyAccess(<PropertyAccessExpression>node);
                case SyntaxKind.VariableDeclaration:
                    return emitVariableDeclaration(<VariableDeclaration>node);
                case SyntaxKind.Identifier:
                    return emitIdentifier(<Identifier>node);
                case SyntaxKind.IfStatement:
                    return emitIfStatement(<IfStatement>node);
                case SyntaxKind.WhileStatement:
                    return emitWhileStatement(<WhileStatement>node);
                case SyntaxKind.DoStatement:
                    return emitDoStatement(<DoStatement>node);
                case SyntaxKind.ForStatement:
                    return emitForStatement(<ForStatement>node);
                case SyntaxKind.ContinueStatement:
                case SyntaxKind.BreakStatement:
                    return emitBreakOrContinueStatement(<BreakOrContinueStatement>node);
                case SyntaxKind.LabeledStatement:
                    return emitLabeledStatement(<LabeledStatement>node);

                default:
                    unhandled(node);

                /*    
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
                case SyntaxKind.ElementAccessExpression:
                    return emitIndexedAccess(<ElementAccessExpression>node);
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
                case SyntaxKind.EmptyStatement:
                    return;
                case SyntaxKind.ForOfStatement:
                case SyntaxKind.ForInStatement:
                    return emitForInOrForOfStatement(<ForInStatement>node);
                case SyntaxKind.ReturnStatement:
                    return emitReturnStatement(<ReturnStatement>node);
                case SyntaxKind.WithStatement:
                    return emitWithStatement(<WithStatement>node);
                case SyntaxKind.SwitchStatement:
                    return emitSwitchStatement(<SwitchStatement>node);
                case SyntaxKind.CaseClause:
                case SyntaxKind.DefaultClause:
                    return emitCaseOrDefaultClause(<CaseOrDefaultClause>node);
                case SyntaxKind.ThrowStatement:
                    return emitThrowStatement(<ThrowStatement>node);
                case SyntaxKind.TryStatement:
                    return emitTryStatement(<TryStatement>node);
                case SyntaxKind.CatchClause:
                    return emitCatchClause(<CatchClause>node);
                case SyntaxKind.DebuggerStatement:
                    return emitDebuggerStatement(node);
                case SyntaxKind.ClassExpression:
                    return emitClassExpression(<ClassExpression>node);
                case SyntaxKind.ClassDeclaration:
                    return emitClassDeclaration(<ClassDeclaration>node);
                case SyntaxKind.EnumMember:
                    return emitEnumMember(<EnumMember>node);
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

    module mbit {
        type StringMap<T> = thumb.StringMap<T>;

        export interface FuncInfo {
            name: string;
            type: string;
            args: number;
            value: number;
        }

        export interface ExtensionInfo {
            enums: StringMap<number>;
            functions: FuncInfo[];
            errors: string;
            sha: string;
            compileData: string;
            hasExtension: boolean;
        }

        var funcInfo: StringMap<FuncInfo>;
        var hex: string[];
        var jmpStartAddr: number;
        var jmpStartIdx: number;
        var bytecodeStartAddr: number;
        var bytecodeStartIdx: number;

        function swapBytes(str: string) {
            var r = ""
            for (var i = 0; i < str.length; i += 2)
                r = str[i] + str[i + 1] + r
            Debug.assert(i == str.length)
            return r
        }


        export function isSetupFor(extInfo: ExtensionInfo) {
            return currentSetup == extInfo.sha
        }

        function parseHexBytes(bytes: string): number[] {
            bytes = bytes.replace(/^[\s:]/, "")
            if (!bytes) return []
            var m = /^([a-f0-9][a-f0-9])/i.exec(bytes)
            if (m)
                return [parseInt(m[1], 16)].concat(parseHexBytes(bytes.slice(2)))
            else
                Debug.fail("bad bytes " + bytes)
        }

        var currentSetup: string = null;
        export var staticBytecodeInfo: any;
        export function setupFor(extInfo: ExtensionInfo, bytecodeInfo: any) {
            if (isSetupFor(extInfo))
                return;

            currentSetup = extInfo.sha;

            var jsinf = bytecodeInfo || staticBytecodeInfo
            hex = jsinf.hex;

            var i = 0;
            var upperAddr = "0000"
            var lastAddr = 0
            var lastIdx = 0
            bytecodeStartAddr = 0
            for (; i < hex.length; ++i) {
                var m = /:02000004(....)/.exec(hex[i])
                if (m) {
                    upperAddr = m[1]
                }
                m = /^:..(....)00/.exec(hex[i])
                if (m) {
                    var newAddr = parseInt(upperAddr + m[1], 16)
                    if (!bytecodeStartAddr && newAddr >= 0x3C000) {
                        var bytes = parseHexBytes(hex[lastIdx])
                        if (bytes[0] != 0x10) {
                            bytes.pop() // checksum
                            bytes[0] = 0x10;
                            while (bytes.length < 20)
                                bytes.push(0x00)
                            hex[lastIdx] = hexBytes(bytes)
                        }
                        Debug.assert((bytes[2] & 0xf) == 0)

                        bytecodeStartAddr = lastAddr + 16
                        bytecodeStartIdx = lastIdx + 1
                    }
                    lastIdx = i
                    lastAddr = newAddr
                }
                m = /^:10....000108010842424242010801083ED8E98D/.exec(hex[i])
                if (m) {
                    jmpStartAddr = lastAddr
                    jmpStartIdx = i
                }
            }

            if (!jmpStartAddr)
                Debug.fail("No hex start")

            funcInfo = {};
            var funs: FuncInfo[] = jsinf.functions.concat(extInfo.functions);

            var addEnum = (enums: any) =>
                Object.keys(enums).forEach(k => {
                    funcInfo[k] = {
                        name: k,
                        type: "E",
                        args: 0,
                        value: enums[k]
                    }
                })

            addEnum(extInfo.enums)
            addEnum(jsinf.enums)

            for (var i = jmpStartIdx + 1; i < hex.length; ++i) {
                var m = /^:10(....)00(.{16})/.exec(hex[i])

                if (!m) continue;

                var s = hex[i].slice(9)
                while (s.length >= 8) {
                    var inf = funs.shift()
                    if (!inf) return;
                    funcInfo[inf.name] = inf;
                    inf.value = parseInt(swapBytes(s.slice(0, 8)), 16) & 0xfffffffe
                    Debug.assert(!!inf.value)
                    s = s.slice(8)
                }
            }

            Debug.fail();
        }

        export function lookupFunc(name: string) {
            if (/^uBit\./.test(name))
                name = name.replace(/^uBit\./, "micro_bit::").replace(/\.(.)/g, (x, y) => y.toUpperCase())
            return funcInfo[name]
        }

        export function lookupFunctionAddr(name: string) {
            var inf = lookupFunc(name)
            if (inf)
                return inf.value - bytecodeStartAddr
            return null
        }

        function isRefDecl(def: Declaration) {
            //let tp = checker.getDeclaredTypeOfSymbol(def.symbol)
            let tp = checker.getTypeAtLocation(def)
            return isRefType(tp)
        }


        export class Location {
            isarg = false;

            constructor(public index: number, public def: Declaration = null) {
            }

            toString() {
                var n = ""
                if (this.def) n += (<any>this.def.name).text || "?"
                if (this.isarg) n = "ARG " + n
                if (this.isRef()) n = "REF " + n
                if (this.isByRefLocal()) n = "BYREF " + n
                return "[" + n + "]"
            }

            isRef() {
                return this.def && isRefDecl(this.def)
            }

            isGlobal() {
                return isGlobalVar(this.def)
            }

            isLocal() {
                return isLocalVar(this.def)
            }

            refSuff() {
                if (this.isRef()) return "Ref"
                else return ""
            }


            isByRefLocal() {
                //return this.def instanceof LocalDef && (<LocalDef>this.def).isByRef()
                return false //TODO
            }

            emitStoreByRef(proc: Procedure) {
                Debug.assert(this.isLocal())

                if (this.isByRefLocal()) {
                    this.emitLoadLocal(proc);
                    proc.emit("pop {r1}");
                    proc.emitCallRaw("bitvm::stloc" + (this.isRef() ? "Ref" : "")); // unref internal
                } else {
                    this.emitStore(proc)
                }
            }

            asmref(proc: Procedure) {
                if (this.isarg) {
                    var idx = proc.args.length - this.index - 1
                    return "[sp, args@" + idx + "] ; " + this.toString()
                } else {
                    var idx = this.index
                    return "[sp, locals@" + idx + "] ; " + this.toString()
                }
            }

            emitStoreCore(proc: Procedure) {
                proc.emit("str r0, " + this.asmref(proc))
            }

            emitStore(proc: Procedure) {
                if (this.isarg)
                    Debug.fail("store for arg")

                if (this.isGlobal()) {
                    proc.emitInt(this.index)
                    proc.emitCall("bitvm::stglb" + this.refSuff(), 0); // unref internal
                } else {
                    Debug.assert(!this.isByRefLocal())
                    if (this.isRef()) {
                        this.emitLoadCore(proc);
                        proc.emitCallRaw("bitvm::decr");
                    }
                    proc.emit("pop {r0}");
                    this.emitStoreCore(proc)
                }
            }

            emitLoadCore(proc: Procedure) {
                proc.emit("ldr r0, " + this.asmref(proc))
            }

            emitLoadByRef(proc: Procedure) {
                if (this.isByRefLocal()) {
                    this.emitLoadLocal(proc);
                    proc.emitCallRaw("bitvm::ldloc" + this.refSuff())
                    proc.emit("push {r0}");
                } else this.emitLoad(proc);
            }

            emitLoadLocal(proc: Procedure) {
                if (this.isarg && proc.argsInR5) {
                    Debug.assert(0 <= this.index && this.index < 32)
                    proc.emit("ldr r0, [r5, #4*" + this.index + "]")
                } else {
                    this.emitLoadCore(proc)
                }
            }

            emitLoad(proc: Procedure, direct = false) {
                if (this.isGlobal()) {
                    proc.emitInt(this.index)
                    proc.emitCall("bitvm::ldglb" + this.refSuff(), 0); // unref internal
                } else {
                    Debug.assert(direct || !this.isByRefLocal())
                    this.emitLoadLocal(proc);
                    proc.emit("push {r0}");
                    if (this.isRef() || this.isByRefLocal()) {
                        proc.emitCallRaw("bitvm::incr");
                    }
                }
            }

            emitClrIfRef(proc: Procedure) {
                // Debug.assert(!this.isarg)
                Debug.assert(!this.isGlobal())
                if (this.isRef() || this.isByRefLocal()) {
                    this.emitLoadCore(proc);
                    proc.emitCallRaw("bitvm::decr");
                }
            }
        }

        export class Procedure {
            numArgs = 0;
            hasReturn = false;
            action: FunctionLikeDeclaration;
            argsInR5 = false;
            seqNo: number;
            lblNo = 0;
            label: string;

            prebody = "";
            body = "";
            locals: Location[] = [];
            args: Location[] = [];

            toString() {
                return this.prebody + this.body
            }

            getName() {
                let text = this.action ? (<Identifier>this.action.name).text : null
                return text || "inline"
            }

            mkLocal(def: Declaration = null) {
                var l = new Location(this.locals.length, def)
                //if (def) console.log("LOCAL: " + def.getName() + ": ref=" + def.isByRef() + " cap=" + def._isCaptured + " mut=" + def._isMutable)
                this.locals.push(l)
                return l
            }

            localIndex(l: Declaration, noargs = false): Location {
                return this.locals.filter(n => n.def == l)[0] ||
                    (noargs ? null : this.args.filter(n => n.def == l)[0])
            }

            emitClrs(omit: Declaration, inclArgs = false) {
                var lst = this.locals
                if (inclArgs)
                    lst = lst.concat(this.args)
                lst.forEach(p => {
                    if (p.def != omit)
                        p.emitClrIfRef(this)
                })
            }

            emitCallRaw(name: string) {
                this.emit("bl " + name + " ; (raw)")
            }

            emitCall(name: string, mask: number) {
                var inf = lookupFunc(name)
                Debug.assert(!!inf, "unimplemented function: " + name)

                Debug.assert(inf.args <= 4)

                if (inf.args >= 4)
                    this.emit("pop {r3}");
                if (inf.args >= 3)
                    this.emit("pop {r2}");
                if (inf.args >= 2)
                    this.emit("pop {r1}");
                if (inf.args >= 1)
                    this.emit("pop {r0}");

                var reglist: string[] = []

                for (var i = 0; i < 4; ++i) {
                    if (mask & (1 << i))
                        reglist.push("r" + i)
                }

                var numMask = reglist.length

                if (inf.type == "F" && mask != 0) {
                    // reserve space for return val
                    reglist.push("r7")
                    this.emit("@stackmark retval")
                }

                Debug.assert((mask & ~0xf) == 0)

                if (reglist.length > 0)
                    this.emit("push {" + reglist.join(",") + "}")

                this.emit("bl " + name)

                if (inf.type == "F") {
                    if (mask == 0)
                        this.emit("push {r0}");
                    else {
                        this.emit("str r0, [sp, retval@-1]")
                    }
                }
                else if (inf.type == "P") {
                    // ok
                }
                else Debug.fail("invalid call type " + inf.type)

                while (numMask-- > 0) {
                    this.emitCall("bitvm::decr", 0);
                }
            }

            emitJmp(trg: string, name = "JMP") {
                var lbl = ""
                if (name == "JMPZ") {
                    lbl = this.mkLabel("jmpz")
                    this.emit("pop {r0}");
                    this.emit("cmp r0, #0")
                    this.emit("bne " + lbl) // this is to *skip* the following 'b' instruction; bne itself has a very short range
                } else if (name == "JMPNZ") {
                    lbl = this.mkLabel("jmpnz")
                    this.emit("pop {r0}");
                    this.emit("cmp r0, #0")
                    this.emit("beq " + lbl)
                } else if (name == "JMP") {
                    // ok
                } else {
                    Debug.fail("bad jmp");
                }

                this.emit("bb " + trg)
                if (lbl)
                    this.emitLbl(lbl)
            }

            mkLabel(root: string): string {
                return "." + root + "." + this.seqNo + "." + this.lblNo++;
            }

            emitLbl(lbl: string) {
                this.emit(lbl + ":")
            }

            emit(name: string) {
                this.body += asmline(name)
            }

            emitMov(v: number) {
                Debug.assert(0 <= v && v <= 255)
                this.emit("movs r0, #" + v)
            }

            emitAdd(v: number) {
                Debug.assert(0 <= v && v <= 255)
                this.emit("adds r0, #" + v)
            }

            emitLdPtr(lbl: string, push = false) {
                Debug.assert(!!lbl)
                this.emit("movs r0, " + lbl + "@hi   ; ldptr " + lbl)
                this.emit("lsls r0, r0, #8")
                this.emit("adds r0, " + lbl + "@lo   ; endldptr");
                if (push)
                    this.emit("push {r0}")
            }

            emitInt(v: number, keepInR0 = false) {
                Debug.assert(v != null);

                var n = Math.floor(v)
                var isNeg = false
                if (n < 0) {
                    isNeg = true
                    n = -n
                }

                if (n <= 255) {
                    this.emitMov(n)
                } else if (n <= 0xffff) {
                    this.emitMov((n >> 8) & 0xff)
                    this.emit("lsls r0, r0, #8")
                    this.emitAdd(n & 0xff)
                } else {
                    this.emitMov((n >> 24) & 0xff)
                    this.emit("lsls r0, r0, #8")
                    this.emitAdd((n >> 16) & 0xff)
                    this.emit("lsls r0, r0, #8")
                    this.emitAdd((n >> 8) & 0xff)
                    this.emit("lsls r0, r0, #8")
                    this.emitAdd((n >> 0) & 0xff)
                }
                if (isNeg) {
                    this.emit("neg r0, r0")
                }

                if (!keepInR0)
                    this.emit("push {r0}")
            }

            stackEmpty() {
                this.emit("@stackempty locals");
            }

            pushLocals() {
                Debug.assert(this.prebody == "")
                this.prebody = this.body
                this.body = ""
            }

            popLocals() {
                var suff = this.body
                this.body = this.prebody

                var len = this.locals.length

                if (len > 0) this.emit("movs r0, #0")
                this.locals.forEach(l => {
                    this.emit("push {r0} ; loc")
                })
                this.emit("@stackmark locals")

                this.body += suff

                Debug.assert(0 <= len && len < 127);
                if (len > 0) this.emit("add sp, #4*" + len + " ; pop locals " + len)
            }
        }

        function hexBytes(bytes: number[]) {
            var chk = 0
            var r = ":"
            bytes.forEach(b => chk += b)
            bytes.push((-chk) & 0xff)
            bytes.forEach(b => r += ("0" + b.toString(16)).slice(-2))
            return r.toUpperCase();
        }

        export class Binary {
            procs: Procedure[] = [];
            globals: Location[] = [];
            buf: number[];
            csource = "";

            strings: StringMap<string> = {};
            stringsBody = "";
            lblNo = 0;

            isDataRecord(s: string) {
                if (!s) return false
                var m = /^:......(..)/.exec(s)
                Debug.assert(!!m)
                return m[1] == "00"
            }

            patchHex(shortForm: boolean) {
                var myhex = hex.slice(0, bytecodeStartIdx)

                Debug.assert(this.buf.length < 32000)

                var ptr = 0

                function nextLine(buf: number[], addr: number) {
                    var bytes = [0x10, (addr >> 8) & 0xff, addr & 0xff, 0]
                    for (var j = 0; j < 8; ++j) {
                        bytes.push((buf[ptr] || 0) & 0xff)
                        bytes.push((buf[ptr] || 0) >>> 8)
                        ptr++
                    }
                    return bytes
                }

                var hd = [0x4207, this.globals.length, bytecodeStartAddr & 0xffff, bytecodeStartAddr >>> 16]
                var tmp = hexTemplateHash()
                for (var i = 0; i < 4; ++i)
                    hd.push(parseInt(swapBytes(tmp.slice(i * 4, i * 4 + 4)), 16))

                myhex[jmpStartIdx] = hexBytes(nextLine(hd, jmpStartAddr))

                ptr = 0

                if (shortForm) myhex = []

                var addr = bytecodeStartAddr;
                var upper = (addr - 16) >> 16
                while (ptr < this.buf.length) {
                    if ((addr >> 16) != upper) {
                        upper = addr >> 16
                        myhex.push(hexBytes([0x02, 0x00, 0x00, 0x04, upper >> 8, upper & 0xff]))
                    }

                    myhex.push(hexBytes(nextLine(this.buf, addr)))
                    addr += 16
                }

                if (!shortForm)
                    hex.slice(bytecodeStartIdx).forEach(l => myhex.push(l))

                return myhex;
            }

            addProc(proc: Procedure) {
                this.procs.push(proc)
                proc.seqNo = this.procs.length
                proc.label = "_" + proc.getName() + "_" + proc.seqNo
            }


            stringLiteral(s: string) {
                var r = "\""
                for (var i = 0; i < s.length; ++i) {
                    // TODO generate warning when seeing high character ?
                    var c = s.charCodeAt(i) & 0xff
                    var cc = String.fromCharCode(c)
                    if (cc == "\\" || cc == "\"")
                        r += "\\" + cc
                    else if (cc == "\n")
                        r += "\\n"
                    else if (c <= 0xf)
                        r += "\\x0" + c.toString(16)
                    else if (c < 32 || c > 127)
                        r += "\\x" + c.toString(16)
                    else
                        r += cc;
                }
                return r + "\""
            }

            emitLiteral(s: string) {
                this.stringsBody += s + "\n"
            }

            emitString(s: string): string {
                if (this.strings.hasOwnProperty(s))
                    return this.strings[s]

                var lbl = "_str" + this.lblNo++
                this.strings[s] = lbl;
                this.emitLiteral(".balign 4");
                this.emitLiteral(lbl + "meta: .short 0xffff, " + s.length)
                this.emitLiteral(lbl + ": .string " + this.stringLiteral(s))
                return lbl
            }

            emit(s: string) {
                this.csource += asmline(s)
            }

            serialize() {
                Debug.assert(this.csource == "");

                this.emit("; start")
                this.emit(".hex 708E3B92C615A841C49866C975EE5197")
                this.emit(".hex " + hexTemplateHash() + " ; hex template hash")
                this.emit(".hex 0000000000000000 ; @SRCHASH@")
                this.emit(".space 16 ; reserved")

                this.procs.forEach(p => {
                    this.csource += "\n" + p.body
                })

                this.csource += this.stringsBody

                this.emit("_program_end:");
            }

            patchSrcHash() {
                //TODO
                //var srcSha = Random.sha256buffer(Util.stringToUint8Array(Util.toUTF8(this.csource)))
                //this.csource = this.csource.replace(/\n.*@SRCHASH@\n/, "\n    .hex " + srcSha.slice(0, 16).toUpperCase() + " ; program hash\n")
            }

            assemble() {
                thumb.test(); // just in case

                var b = new thumb.File();
                b.lookupExternalLabel = lookupFunctionAddr;
                // b.throwOnError = true;
                b.emit(this.csource);
                this.csource = b.getSource(!peepDbg);
                if (b.errors.length > 0) {
                    var userErrors = ""
                    b.errors.forEach(e => {
                        var m = /^user(\d+)/.exec(e.scope)
                        if (m) {
                            // This generally shouldn't happen, but it may for certin kind of global 
                            // errors - jump range and label redefinitions
                            var no = parseInt(m[1])
                            var proc = this.procs.filter(p => p.seqNo == no)[0]
                            if (proc && proc.action)
                                userErrors += lf("At function {0}:\n", proc.getName())
                            else
                                userErrors += lf("At inline assembly:\n")
                            userErrors += e.message
                        }
                    })

                    if (userErrors) {
                        //TODO
                        console.log(lf("errors in inline assembly"))
                        console.log(userErrors)
                    } else {
                        throw new Error(b.errors[0].message)
                    }
                } else {
                    this.buf = b.buf;
                }
            }
        }

        export var peepDbg = false;

        function asmline(s: string) {
            if (!/(^\s)|(:$)/.test(s))
                s = "    " + s
            return s + "\n"
        }

        function hexTemplateHash() {
            var sha = currentSetup ? currentSetup.slice(0, 16) : ""
            while (sha.length < 16) sha += "0"
            return sha.toUpperCase()
        }

        function emptyExtInfo() {
            return <ExtensionInfo>{
                enums: {},
                functions: [],
                errors: "",
                sha: "",
                compileData: "",
                hasExtension: false,
            }
        }

        export function setup() {
            if (currentSetup == null)
                setupFor(emptyExtInfo(), null)
        }
    }
}