/// <reference path="../compiler/tsc.ts"/>
/// <reference path="thumb.ts"/>

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
    
namespace mbit
{
    export interface FuncInfo {
        name: string;
        type: string;
        args: number;
        value: number;
    }

    export interface ExtensionInfo
    {
        enums:StringMap<number>;
        functions:FuncInfo[];
        errors:string;
        sha:string;
        compileData:string;
        hasExtension:boolean;
    }

    var funcInfo:StringMap<FuncInfo>;
    var hex:string[];
    var jmpStartAddr:number;
    var jmpStartIdx:number;
    var bytecodeStartAddr:number;
    var bytecodeStartIdx:number;

    function swapBytes(str:string)
    {
        var r = ""
        for (var i = 0; i < str.length; i += 2)
            r = str[i] + str[i + 1] + r
        ts.Debug.assert(i == str.length)
        return r
    }

    function userError(msg:string)
    {
        var e = new Error(msg);
        (<any>e).bitvmUserError = true;
        throw e;
    }

    export function isSetupFor(extInfo:ExtensionInfo)
    {
        return currentSetup == extInfo.sha
    }

    function parseHexBytes(bytes:string):number[]
    {
        bytes = bytes.replace(/^[\s:]/, "")
        if (!bytes) return []
        var m = /^([a-f0-9][a-f0-9])/i.exec(bytes)
        if (m)
            return [parseInt(m[1], 16)].concat(parseHexBytes(bytes.slice(2)))
        else
            ts.Debug.fail("bad bytes " + bytes)
    }

    var currentSetup:string = null;
    export function setupFor(extInfo:ExtensionInfo, bytecodeInfo:any)
    {
        if (isSetupFor(extInfo))
            return;

        currentSetup = extInfo.sha;

        var jsinf = bytecodeInfo
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
                    ts.Debug.assert((bytes[2] & 0xf) == 0)

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
            ts.Debug.fail("No hex start")

        funcInfo = {};
        var funs:FuncInfo[] = jsinf.functions.concat(extInfo.functions);

        var addEnum = (enums:any) =>
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
                ts.Debug.assert(!!inf.value)
                s = s.slice(8)
            }
        }
        
        ts.Debug.fail();
    }

    function lookupFunc(name:string)
    {
        if (/^uBit\./.test(name))
            name = name.replace(/^uBit\./, "micro_bit::").replace(/\.(.)/g, (x, y) => y.toUpperCase())
        return funcInfo[name]
    }

    export function lookupFunctionAddr(name:string)
    {
        var inf = lookupFunc(name)
        if (inf)
            return inf.value - bytecodeStartAddr
        return null
    }

    function isRefKind(def:ts.Declaration)
    {
        return false // TODO
    }


    export class Location
    {
        isarg = false;

        constructor(public index:number, public def:ts.DeclarationStatement = null)
        {
        }

        toString()
        {
            var n = ""
            if (this.def) n += this.def.name.text
            if (this.isarg) n = "ARG " + n
            if (this.isRef()) n = "REF " + n
            if (this.isByRefLocal()) n = "BYREF " + n
            return "[" + n + "]"
        }

        isRef()
        {
            return this.def && isRefKind(this.def)
        }
        
        isGlobal()
        {
            return false // TODO
        }

        refSuff()
        {
            if (this.isRef()) return "Ref"
            else return ""
        }
        

        isByRefLocal()
        {
            //return this.def instanceof LocalDef && (<LocalDef>this.def).isByRef()
            return false //TODO
        }

        emitStoreByRef(proc:Procedure)
        {
            //ts.Debug.assert(this.def instanceof LocalDef) TODO

            if (this.isByRefLocal()) {
                this.emitLoadLocal(proc);
                proc.emit("pop {r1}");
                proc.emitCallRaw("bitvm::stloc" + (this.isRef() ? "Ref" : "")); // unref internal
            } else {
                this.emitStore(proc)
            }
        }

        asmref(proc:Procedure)
        {
            if (this.isarg) {
                var idx = proc.args.length - this.index - 1
                return "[sp, args@" + idx + "] ; " + this.toString()
            } else {
                var idx = this.index
                return "[sp, locals@" + idx + "] ; " + this.toString()
            }
        }

        emitStoreCore(proc:Procedure)
        {
            proc.emit("str r0, " + this.asmref(proc))
        }

        emitStore(proc:Procedure)
        {
            if (this.isarg)
                ts.Debug.fail("store for arg")

            if (this.isGlobal()) {
                proc.emitInt(this.index)
                proc.emitCall("bitvm::stglb" + this.refSuff(), 0); // unref internal
            } else {
                ts.Debug.assert(!this.isByRefLocal())
                if (this.isRef()) {
                    this.emitLoadCore(proc);
                    proc.emitCallRaw("bitvm::decr");
                }
                proc.emit("pop {r0}");
                this.emitStoreCore(proc)
            }
        }

        emitLoadCore(proc:Procedure)
        {
            proc.emit("ldr r0, " + this.asmref(proc))
        }

        emitLoadByRef(proc:Procedure)
        {
            if (this.isByRefLocal()) {
                this.emitLoadLocal(proc);
                proc.emitCallRaw("bitvm::ldloc" + this.refSuff())
                proc.emit("push {r0}");
            } else this.emitLoad(proc);
        }

        emitLoadLocal(proc:Procedure)
        {
            if (this.isarg && proc.argsInR5) {
                ts.Debug.assert(0 <= this.index && this.index < 32)
                proc.emit("ldr r0, [r5, #4*" + this.index + "]")
            } else {
                this.emitLoadCore(proc)
            }
        }

        emitLoad(proc:Procedure, direct = false)
        {
            if (this.isGlobal()) {
                proc.emitInt(this.index)
                proc.emitCall("bitvm::ldglb" + this.refSuff(), 0); // unref internal
            } else {
                ts.Debug.assert(direct || !this.isByRefLocal())
                this.emitLoadLocal(proc);
                proc.emit("push {r0}");
                if (this.isRef() || this.isByRefLocal()) {
                    proc.emitCallRaw("bitvm::incr");
                }
            }
        }

        emitClrIfRef(proc:Procedure)
        {
            // ts.Debug.assert(!this.isarg)
            ts.Debug.assert(!this.isGlobal())
            if (this.isRef() || this.isByRefLocal()) {
                this.emitLoadCore(proc);
                proc.emitCallRaw("bitvm::decr");
            }
        }
    }

    export class Procedure
    {
        numArgs = 0;
        hasReturn = false;
        action:ts.FunctionDeclaration;
        argsInR5 = false;
        seqNo:number;
        lblNo = 0;
        label:string;

        prebody = "";
        body = "";
        locals:Location[] = [];
        args:Location[] = [];

        toString()
        {
            return this.prebody + this.body
        }

        mkLocal(def:ts.DeclarationStatement = null)
        {
            var l = new Location(this.locals.length, def)
            //if (def) console.log("LOCAL: " + def.getName() + ": ref=" + def.isByRef() + " cap=" + def._isCaptured + " mut=" + def._isMutable)
            this.locals.push(l)
            return l
        }

        emitClrs(omit:ts.Declaration, inclArgs = false)
        {
            var lst = this.locals
            if (inclArgs)
                lst = lst.concat(this.args)
            lst.forEach(p => {
                if (p.def != omit)
                    p.emitClrIfRef(this)
            })
        }

        emitCallRaw(name:string)
        {
            this.emit("bl " + name + " ; (raw)")
        }

        emitCall(name:string, mask:number)
        {
            var inf = lookupFunc(name)
            ts.Debug.assert(!!inf, "unimplemented function: " + name)

            ts.Debug.assert(inf.args <= 4)

            if (inf.args >= 4)
                this.emit("pop {r3}");
            if (inf.args >= 3)
                this.emit("pop {r2}");
            if (inf.args >= 2)
                this.emit("pop {r1}");
            if (inf.args >= 1)
                this.emit("pop {r0}");

            var reglist:string[] = []

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

            ts.Debug.assert((mask & ~0xf) == 0)

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
            else ts.Debug.fail("invalid call type " + inf.type)

            while (numMask-- > 0) {
                this.emitCall("bitvm::decr", 0);
            }
        }

        emitJmp(trg:string, name = "JMP")
        {
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
                ts.Debug.fail("bad jmp");
            }

            this.emit("bb " + trg)
            if (lbl)
                this.emitLbl(lbl)
        }

        mkLabel(root:string):string
        {
            return "." + root + "." + this.seqNo + "." + this.lblNo++;
        }

        emitLbl(lbl:string)
        {
            this.emit(lbl + ":")
        }

        emit(name:string)
        {
            this.body += asmline(name)
        }

        emitMov(v:number)
        {
            ts.Debug.assert(0 <= v && v <= 255)
            this.emit("movs r0, #" + v)
        }

        emitAdd(v:number)
        {
            ts.Debug.assert(0 <= v && v <= 255)
            this.emit("adds r0, #" + v)
        }

        emitLdPtr(lbl:string, push = false)
        {
            ts.Debug.assert(!!lbl)
            this.emit("movs r0, " + lbl + "@hi   ; ldptr " + lbl)
            this.emit("lsls r0, r0, #8")
            this.emit("adds r0, " + lbl + "@lo   ; endldptr");
            if (push)
                this.emit("push {r0}")
        }

        emitInt(v:number, keepInR0 = false)
        {
            ts.Debug.assert(v != null);

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

        stackEmpty()
        {
            this.emit("@stackempty locals");
        }

        pushLocals()
        {
            ts.Debug.assert(this.prebody == "")
            this.prebody = this.body
            this.body = ""
        }

        popLocals()
        {
            var suff = this.body
            this.body = this.prebody

            var len = this.locals.length

            if (len > 0) this.emit("movs r0, #0")
            this.locals.forEach(l => {
                this.emit("push {r0} ; loc")
            })
            this.emit("@stackmark locals")

            this.body += suff

            ts.Debug.assert(0 <= len && len < 127);
            if (len > 0) this.emit("add sp, #4*" + len + " ; pop locals " + len)
        }
    }

    function hexBytes(bytes:number[]) {
        var chk = 0
        var r = ":"
        bytes.forEach(b => chk += b)
        bytes.push((-chk) & 0xff)
        bytes.forEach(b => r += ("0" + b.toString(16)).slice(-2))
        return r.toUpperCase();
    }

    export class Binary
    {
        procs:Procedure[] = [];
        globals:Location[] = [];
        buf:number[];
        csource = "";

        strings:StringMap<string> = {};
        stringsBody = "";
        lblNo = 0;

        isDataRecord(s:string)
        {
            if (!s) return false
            var m = /^:......(..)/.exec(s)
            ts.Debug.assert(!!m)
            return m[1] == "00"
        }

        patchHex(shortForm:boolean)
        {
            var myhex = hex.slice(0, bytecodeStartIdx)

            ts.Debug.assert(this.buf.length < 32000)

            var ptr = 0

            function nextLine(buf:number[], addr:number)
            {
                var bytes = [0x10, (addr>>8)&0xff, addr&0xff, 0]
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

        addProc(proc:Procedure)
        {
            this.procs.push(proc)
            proc.seqNo = this.procs.length
            proc.label = "_" + (proc.action ? proc.action.name.text.replace(/[^\w]/g, "") : "inline") + "_" + proc.seqNo
        }


        stringLiteral(s:string)
        {
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
         
        emitLiteral(s:string)
        {
            this.stringsBody += s + "\n"
        }

        emitString(s:string):string
        {
            if (this.strings.hasOwnProperty(s))
                return this.strings[s]

            var lbl = "_str" + this.lblNo++
            this.strings[s] = lbl;
            this.emitLiteral(".balign 4");
            this.emitLiteral(lbl + "meta: .short 0xffff, " + s.length)
            this.emitLiteral(lbl + ": .string " + this.stringLiteral(s))
            return lbl
        }

        emit(s:string)
        {
            this.csource += asmline(s)
        }

        serialize()
        {
            ts.Debug.assert(this.csource == "");

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

        patchSrcHash()
        {
            //TODO
            //var srcSha = Random.sha256buffer(Util.stringToUint8Array(Util.toUTF8(this.csource)))
            //this.csource = this.csource.replace(/\n.*@SRCHASH@\n/, "\n    .hex " + srcSha.slice(0, 16).toUpperCase() + " ; program hash\n")
        }

        assemble()
        {
            mbit.testThumb(); // just in case
            
            var b = new ThumbBinary();
            b.lookupExternalLabel = lookupFunctionAddr;
            // b.throwOnError = true;
            b.emit(this.csource);
            this.csource = b.getSource(!/peepdbg=1/.test(document.URL));
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
                            userErrors += lf("At function {0}:\n", proc.action.name.text)
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

    function asmline(s:string)
    {
        if (!/(^\s)|(:$)/.test(s))
            s = "    " + s
        return s + "\n"
    }

    function hexTemplateHash()
    {
        var sha = currentSetup ? currentSetup.slice(0, 16) : ""
        while (sha.length < 16) sha += "0"
        return sha.toUpperCase()
    }

    function emptyExtInfo()
    {
        return <ExtensionInfo> {
            enums: {},
            functions: [],
            errors: "",
            sha: "",
            compileData: "",
            hasExtension: false,
        }
    }

    function setup()
    {
        if (currentSetup == null)
            setupFor(emptyExtInfo(), null)
    }
}
