/// <reference path="../compiler/tsc.ts"/>
/// <reference path="thumb.ts"/>

/* @internal */
namespace ts {
    declare var require: any;

    function stringKind(n: Node) {
        if (!n) return "<null>"
        return (<any>ts).SyntaxKind[n.kind]
    }

    function inspect(n: Node) {
        console.log(stringKind(n))
    }

    function userError(msg: string) {
        debugger;
        var e = new Error(msg);
        (<any>e).bitvmUserError = true;
        throw e;
    }

    function isRefType(t: Type) {
        checkType(t);
        return !(t.flags & (TypeFlags.Number | TypeFlags.Boolean | TypeFlags.Enum))
    }

    function isRefDecl(def: Declaration) {
        //let tp = checker.getDeclaredTypeOfSymbol(def.symbol)
        let tp = typeOf(def)
        return isRefType(tp)
    }



    function getEnclosingFunction(node0: Node) {
        let node = node0
        while (true) {
            node = node.parent
            if (!node)
                userError(lf("cannot determine parent of {0}", stringKind(node0)))
            if (node.kind == SyntaxKind.FunctionDeclaration ||
                node.kind == SyntaxKind.ArrowFunction ||
                node.kind == SyntaxKind.FunctionExpression) return <FunctionLikeDeclaration>node
            if (node.kind == SyntaxKind.SourceFile) return null
        }
    }

    function isGlobalVar(d: Declaration) {
        return d.kind == SyntaxKind.VariableDeclaration && !getEnclosingFunction(d)
    }

    function isLocalVar(d: Declaration) {
        return d.kind == SyntaxKind.VariableDeclaration && !isGlobalVar(d);
    }

    function isParameter(d: Declaration) {
        return d.kind == SyntaxKind.Parameter
    }

    interface CommentAttrs {
        shim?: string;
        enumval?: string;
        helper?: string;
    }

    interface ClassInfo {
        reffields: PropertyDeclaration[];
        primitivefields: PropertyDeclaration[];
        allfields: PropertyDeclaration[];
    }

    let lf = thumb.lf;
    let checker: TypeChecker;


    function isArrayType(t: Type) {
        return (t.flags & TypeFlags.Reference) && t.symbol.name == "Array"
    }

    function isClassType(t: Type) {
        // check if we like the class?
        return (t.flags & TypeFlags.Class)
    }

    function arrayElementType(t: Type): Type {
        if (isArrayType(t))
            return checkType((<TypeReference>t).typeArguments[0])
        return null;
    }

    function deconstructFunctionType(t: Type) {
        let sigs = checker.getSignaturesOfType(t, SignatureKind.Call)
        if (sigs && sigs.length == 1)
            return sigs[0]
        return null
    }

    function checkType(t: Type) {
        let ok = TypeFlags.String | TypeFlags.Number | TypeFlags.Boolean | TypeFlags.Void | TypeFlags.Enum | TypeFlags.Null
        if ((t.flags & ok) == 0) {
            if (isArrayType(t)) return t;
            if (isClassType(t)) return t;
            if (deconstructFunctionType(t)) return t;
            userError(lf("unsupported type: {0} 0x{1}", checker.typeToString(t), t.flags.toString(16)))
        }
        return t
    }

    function typeOf(node: Node) {
        let r: Type;
        if (isExpression(node))
            r = checker.getContextualType(<Expression>node)
        if (!r) r = checker.getTypeAtLocation(node);
        return checkType(r)
    }

    type StringMap<T> = thumb.StringMap<T>;
    type VarOrParam = VariableDeclaration | ParameterDeclaration;

    interface VariableInfo {
        captured?: boolean;
        written?: boolean;
    }

    interface FunctionInfo {
        capturedVars: VarOrParam[];
    }

    export function emitMBit(program: Program): EmitResult {
        const diagnostics = createDiagnosticCollection();
        checker = program.getTypeChecker();
        let classInfos: thumb.StringMap<ClassInfo> = {}

        mbit.staticBytecodeInfo = require("./hexinfo.js");
        mbit.setup();

        const fs = require("fs");
        let bin: mbit.Binary;
        let proc: mbit.Procedure;

        function reset() {
            bin = new mbit.Binary();
            proc = new mbit.Procedure();
            bin.addProc(proc);
        }

        let variableStatus: StringMap<VariableInfo> = {};
        let functionInfo: StringMap<FunctionInfo> = {};

        reset();
        program.getSourceFiles().forEach(emit);

        if (diagnostics.getModificationCount() == 0) {
            console.log("second pass")
            reset();
            bin.finalPass = true
            program.getSourceFiles().forEach(emit);

            finalEmit();
        }

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

        function unhandled(n: Node, addInfo = "") {
            if (addInfo)
                addInfo = " (" + addInfo + ")"
            userError(lf("Unsupported syntax node: {0}", stringKind(n)) + addInfo);
        }

        function getFunctionInfo(f: FunctionLikeDeclaration) {
            let key = getNodeId(f) + ""
            let info = functionInfo[key]
            if (!info)
                functionInfo[key] = info = {
                    capturedVars: []
                }
            return info
        }

        function getVarInfo(v: Declaration) {
            let key = getNodeId(v) + ""
            let info = variableStatus[key]
            if (!info)
                variableStatus[key] = info = {}
            return info;
        }

        function recordUse(v: VarOrParam, written = false) {
            let info = getVarInfo(v)
            if (written)
                info.written = true;
            let outer = getEnclosingFunction(v)
            if (outer == null || outer == proc.action) {
                // not captured
            } else {
                if (proc.info.capturedVars.indexOf(v) < 0)
                    proc.info.capturedVars.push(v);
                info.captured = true;
            }
        }

        function scope(f: () => void) {
            let prevProc = proc;
            try {
                f();
            } finally {
                proc = prevProc;
            }
        }

        function finalEmit() {
            if (diagnostics.getModificationCount())
                return;
            bin.serialize();
            bin.patchSrcHash();
            fs.writeFileSync("microbit.asm", bin.csource)
            bin.assemble();
            const hex = bin.patchHex(false).join("\r\n") + "\r\n"
            fs.writeFileSync("microbit.asm", bin.csource) // optimized
            fs.writeFileSync("microbit.hex", hex)
            fs.writeFileSync("microbit.js", bin.jssource)
            console.log("wrote microbit.hex and microbit.asm")
        }

        function lookupLocation(decl: Declaration): mbit.Location {
            if (isGlobalVar(decl)) {
                let ex = bin.globals.filter(l => l.def == decl)[0]
                if (!ex) {
                    ex = new mbit.Location(bin.globals.length, decl, getVarInfo(decl))
                    bin.globals.push(ex)
                }
                return ex
            } else {
                let res = proc.localIndex(decl)
                if (!res) {
                    if (bin.finalPass)
                        userError(lf("cannot locate identifer"))
                    else
                        res = proc.mkLocal(decl, getVarInfo(decl))
                }
                return res
            }
        }

        function getClassInfo(t: Type) {
            let decl = <ClassDeclaration>t.symbol.valueDeclaration
            let id = getNodeId(decl)
            let info = classInfos[id + ""]
            if (!info) {
                info = {
                    reffields: [],
                    primitivefields: [],
                    allfields: null
                }
                classInfos[id + ""] = info;
                for (let mem of decl.members) {
                    if (mem.kind == SyntaxKind.PropertyDeclaration) {
                        let pdecl = <PropertyDeclaration>mem
                        if (isRefType(typeOf(pdecl)))
                            info.reffields.push(pdecl)
                        else info.primitivefields.push(pdecl)
                    }
                }
                info.allfields = info.reffields.concat(info.primitivefields)
            }
            return info;
        }

        function emitIdentifier(node: Identifier) {
            let decl = getDecl(node)
            if (decl && (decl.kind == SyntaxKind.VariableDeclaration || decl.kind == SyntaxKind.Parameter)) {
                let l = lookupLocation(decl)
                recordUse(<VarOrParam>decl)
                l.emitLoadByRef(proc)
            } else {
                unhandled(node, "id")
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
        function emitArrayLiteral(node: ArrayLiteralExpression) {
            let eltT = arrayElementType(typeOf(node))
            let isRef = isRefType(eltT)
            if (eltT.flags & TypeFlags.String)
                proc.emitInt(3);
            else if (isRef)
                proc.emitInt(1);
            else
                proc.emitInt(0);
            proc.emitCall("collection::mk", 0)
            for (let elt of node.elements) {
                emit(elt)
                proc.emit("pop {r1}")
                proc.emit("ldr r0, [sp, #0]")
                if (isRef)
                    proc.emit("push {r1}")
                proc.emitCallRaw("collection::add")
                if (isRef) {
                    proc.emit("pop {r0}")
                    proc.emitCallRaw("bitvm::decr")
                }
            }
        }
        function emitObjectLiteral(node: ObjectLiteralExpression) { }
        function emitPropertyAssignment(node: PropertyDeclaration) {
            if (node.initializer)
                userError(lf("class field initializers not supported"))
            // do nothing
        }
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
            } else if (decl.kind == SyntaxKind.PropertySignature) {
                if (attrs.shim) {
                    emitShim(decl, node, [node.expression])
                } else {
                    unhandled(node, "no {shim:...}");
                }
            } else if (decl.kind == SyntaxKind.PropertyDeclaration) {
                let idx = fieldIndex(node)
                emit(node.expression)
                proc.emitInt(idx)
                proc.emitCall("bitvm::ldfld" + refSuff(node), 0) // internal unref
            } else {
                unhandled(node, stringKind(decl));
            }
        }

        function emitIndexedAccess(node: ElementAccessExpression) {
            let t = typeOf(node.expression)

            let collType = ""
            if (t.flags & TypeFlags.String)
                collType = "string"
            else if (isArrayType(t))
                collType = "collection"

            if (collType) {
                if (typeOf(node.argumentExpression).flags & TypeFlags.Number) {
                    emit(node.expression)
                    emit(node.argumentExpression)
                    proc.emitCall(collType + "::at", 1)
                } else {
                    unhandled(node, lf("non-numeric indexer on {0}", collType))
                }
            } else {
                unhandled(node, "unsupported indexer")
            }
        }

        function getDecl(node: Node): Declaration {
            if (!node) return null
            let sym = checker.getSymbolAtLocation(node)
            return sym ? sym.valueDeclaration : null
        }
        function getComments(node: Node) {
            let src = getSourceFileOfNode(node)
            let doc = getLeadingCommentRangesOfNodeFromText(node, src.text)
            if (!doc) return "";
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
            return isRefType(typeOf(e))
        }
        function getMask(args: Expression[]) {
            Debug.assert(args.length <= 8)
            var m = 0
            args.forEach((a, i) => {
                if (isRefExpr(a))
                    m |= (1 << i)
            })
            return m
        }

        function emitShim(decl: Declaration, node: Node, args: Expression[]) {
            let attrs = parseComments(decl)
            let hasRet = !(typeOf(node).flags & TypeFlags.Void)
            let nm = attrs.shim

            if (nm == "TD_NOOP") {
                Debug.assert(!hasRet)
                return
            }

            if (nm == "TD_ID") {
                Debug.assert(args.length == 1)
                emit(args[0])
                return
            }

            let inf = mbit.lookupFunc(attrs.shim)
            if (inf) {
                if (!hasRet) {
                    if (inf.type != "P")
                        userError("expecting procedure for " + nm);
                } else {
                    if (inf.type != "F")
                        userError("expecting function for " + nm);
                }
                if (args.length != inf.args)
                    userError("argument number mismatch: " + args.length + " vs " + inf.args)
            } else {
                userError("function not found: " + nm)
            }

            args.forEach(emit)
            proc.emitCall(attrs.shim, getMask(args));
        }

        function emitCallExpression(node: CallExpression) {
            let decl = getDecl(node.expression)
            let attrs = parseComments(decl)
            let hasRet = !(typeOf(node).flags & TypeFlags.Void)
            let args = node.arguments.slice(0)

            function emitPlain() {
                args.forEach(emit)
                proc.emit("bl " + getFunctionLabel(<FunctionLikeDeclaration>decl))
                if (args.length > 0)
                    proc.emit("add sp, #4*" + args.length)
                if (hasRet)
                    proc.emit("push {r0}");
            }

            if (decl && decl.kind == SyntaxKind.FunctionDeclaration) {
                if (attrs.shim) {
                    emitShim(decl, node, args);
                    return;
                }

                emitPlain();
                return
            }

            if (decl && decl.kind == SyntaxKind.MethodSignature) {
                if (node.expression.kind == SyntaxKind.PropertyAccessExpression)
                    args.unshift((<PropertyAccessExpression>node.expression).expression)
                else
                    unhandled(node, "strange method call")
                if (attrs.shim) {
                    emitShim(decl, node, args);
                    return;
                } else if (attrs.helper) {
                    let syms = checker.getSymbolsInScope(node, SymbolFlags.Module)
                    let helpersModule = <ModuleDeclaration>syms.filter(s => s.name == "helpers")[0].valueDeclaration;
                    let helperStmt = (<ModuleBlock>helpersModule.body).statements.filter(s => s.symbol.name == attrs.helper)[0]
                    if (!helperStmt)
                        userError(lf("helpers.{0} not found", attrs.helper))
                    if (helperStmt.kind != SyntaxKind.FunctionDeclaration)
                        userError(lf("helpers.{0} isn't a function", attrs.helper))
                    decl = <FunctionDeclaration>helperStmt;
                    emitPlain();
                    return
                }

                unhandled(node, "non-shim method call");
            }

            if (decl && (decl.kind == SyntaxKind.VariableDeclaration || decl.kind == SyntaxKind.Parameter)) {
                if (args.length > 1)
                    userError("lambda functions with more than 1 argument not supported")

                if (hasRet)
                    userError("lambda functions cannot yet return values")

                let suff = args.length + ""
                if (suff == "0") suff = ""

                args.unshift(node.expression)
                args.forEach(emit)

                proc.emitCall("action::run" + suff, getMask(args));
                return
            }

            unhandled(node, stringKind(decl))
        }

        function getFunctionLabel(node: FunctionLikeDeclaration) {
            let text = node && node.name ? (<Identifier>node.name).text : null
            text = text || "inline"
            return "_" + text.replace(/[^\w]+/g, "_") + "_" + getNodeId(node)
        }
        function emitNewExpression(node: NewExpression) {
            let t = typeOf(node)
            if (isArrayType(t)) {
                Debug.fail();
            } else if (isClassType(t)) {
                if (node.arguments && node.arguments.length)
                    userError(lf("constructor arguments not supported"));
                let info = getClassInfo(t)
                proc.emitInt(info.reffields.length)
                proc.emitInt(info.allfields.length)
                proc.emitCall("record::mk", 0)
            } else {
                unhandled(node)
            }
        }
        function emitTaggedTemplateExpression(node: TaggedTemplateExpression) { }
        function emitTypeAssertion(node: TypeAssertion) {
            emit(node.expression)
        }
        function emitAsExpression(node: AsExpression) { }
        function emitParenExpression(node: ParenthesizedExpression) {
            emit(node.expression)
        }
        function emitFunctionDeclaration(node: FunctionLikeDeclaration) {
            if (node.flags & NodeFlags.Ambient)
                return;

            let info = getFunctionInfo(node)

            let refs = info.capturedVars.filter(v => isRefDecl(v))
            let prim = info.capturedVars.filter(v => !isRefDecl(v))
            let caps = refs.concat(prim)
            let locals = caps.map((v, i) => {
                let l = new mbit.Location(i, v, getVarInfo(v))
                l.iscap = true
                return l;
            })

            let isLambda = getEnclosingFunction(node) != null;

            if (isLambda) {
                proc.emitInt(refs.length)
                proc.emitInt(caps.length)
                proc.emitLdPtr(getFunctionLabel(node), true)
                proc.emitCall("action::mk", 0)
                caps.forEach((l, i) => {
                    proc.emitInt(i)
                    let loc = proc.localIndex(l)
                    if (!loc)
                        userError("cannot find captured value: " + checker.symbolToString(l.symbol))
                    loc.emitLoad(proc, true) // direct load
                    proc.emitCall("bitvm::stclo", 0)
                    // already done by emitCall
                    // proc.emit("push {r0}");
                })
            } else {
                Debug.assert(caps.length == 0);
            }

            scope(() => {
                proc = new mbit.Procedure();
                proc.action = node;
                proc.info = info;
                proc.captured = locals;
                bin.addProc(proc);

                proc.emit(".section code");
                proc.emit(".balign 4");
                proc.emitLbl(getFunctionLabel(node));

                if (isLambda) {
                    proc.emit(".short 0xffff, 0x0000   ; action literal");
                    proc.emit("@stackmark inlfunc");
                    proc.emit("push {r5, lr}");
                    proc.emit("mov r5, r1");

                    node.parameters.forEach((p, i) => {
                        if (i >= 2)
                            userError(lf("only up to two parameters supported in lambdas"))
                        proc.emit(`push {r${i + 2}}`)
                    })
                    proc.emit("@stackmark args");
                } else {
                    proc.emit("@stackmark func");
                    proc.emit("@stackmark args");
                    proc.emit("push {lr}");
                }

                proc.pushLocals();
                
                proc.args = node.parameters.map((p, i) => {
                    let l = new mbit.Location(i, p, getVarInfo(p))
                    l.isarg = true
                    return l
                })
                
                proc.args.forEach(l => {
                    if (l.isByRefLocal()) {
                        // TODO add C++ support function to do this
                        proc.emitCallRaw("bitvm::mkloc" + l.refSuff())
                        proc.emit("push {r0}")
                        proc.emitCallRaw("bitvm::incr")
                        l.emitLoadCore(proc)
                        proc.emit("mov r1, r0")
                        proc.emit("ldr r0, [sp, #0]")
                        proc.emitCallRaw("bitvm::stloc" + l.refSuff()); // unref internal
                        proc.emit("pop {r0}")
                        l.emitStoreCore(proc)
                    }                    
                })

                emit(node.body);

                proc.emitLbl(getLabels(node).ret)
                proc.stackEmpty();

                if (proc.hasReturn()) {
                    proc.emit("push {r0}");
                    proc.emitClrs();
                    proc.emit("pop {r0}");
                } else {
                    proc.emitClrs();
                }

                proc.popLocals();

                if (isLambda) {
                    proc.emit("@stackempty args")
                    if (node.parameters.length)
                        proc.emit("add sp, #4*" + node.parameters.length + " ; pop args")
                    proc.emit("pop {r5, pc}");
                    proc.emit("@stackempty inlfunc");
                } else {
                    proc.emit("pop {pc}");
                    proc.emit("@stackempty func");
                    proc.emit("@stackempty args")
                }
            })
        }

        function emitDeleteExpression(node: DeleteExpression) { }
        function emitTypeOfExpression(node: TypeOfExpression) { }
        function emitVoidExpression(node: VoidExpression) { }
        function emitAwaitExpression(node: AwaitExpression) { }
        function emitPrefixUnaryExpression(node: PrefixUnaryExpression) {
            let tp = typeOf(node.operand)
            if (tp.flags & TypeFlags.Boolean) {
                if (node.operator == SyntaxKind.ExclamationToken) {
                    emit(node.operand)
                    proc.emitCall("boolean::not_", 0)
                    return
                }
            }

            if (tp.flags & TypeFlags.Number) {
                switch (node.operator) {
                    case SyntaxKind.PlusPlusToken:
                        return emitIncrement(node, "number::add", false)
                    case SyntaxKind.MinusMinusToken:
                        return emitIncrement(node, "number::subtract", false)
                    case SyntaxKind.MinusToken:
                        emit(node.operand)
                        proc.emit("pop {r0}")
                        proc.emit("negs r0, r0")
                        proc.emit("push {r0}")
                        return
                    case SyntaxKind.PlusToken:
                        emit(node.operand)
                        return // no-op
                    default: unhandled(node, "postfix unary number")
                }
            }

            unhandled(node, "prefix unary");
        }

        function emitIncrement(expr: PrefixUnaryExpression | PostfixUnaryExpression, meth: string, post: boolean) {
            // TODO expr evaluated twice
            let bogus = isBogusReturn(expr)
            emit(expr.operand)
            if (!post && !bogus)
                proc.emit("push {r0}")
            proc.emitInt(1)
            proc.emitCall(meth, 0)
            if (post && !bogus)
                proc.emit("push {r0}")
            emitStore(expr.operand)
        }

        function emitPostfixUnaryExpression(node: PostfixUnaryExpression) {
            let tp = typeOf(node.operand)

            if (tp.flags & TypeFlags.Number) {
                switch (node.operator) {
                    case SyntaxKind.PlusPlusToken:
                        return emitIncrement(node, "number::add", true)
                    case SyntaxKind.MinusMinusToken:
                        return emitIncrement(node, "number::subtract", true)
                    default: unhandled(node, "postfix unary number")
                }
            }
            unhandled(node)
        }

        function isBogusReturn(node: Expression) {
            let par = node.parent
            if (!(par.kind == SyntaxKind.ExpressionStatement ||
                (par.kind == SyntaxKind.ForStatement &&
                    (<ForStatement>par).incrementor == node || (<ForStatement>par).initializer == node)))
                return false

            if (node.kind == SyntaxKind.PrefixUnaryExpression || node.kind == SyntaxKind.PostfixUnaryExpression) {
                let iexpr = <PrefixUnaryExpression | PostfixUnaryExpression>node
                return iexpr.operator == SyntaxKind.PlusPlusToken || iexpr.operator == SyntaxKind.MinusMinusToken
            }

            if (node.kind == SyntaxKind.BinaryExpression) {
                let bexpr = <BinaryExpression>node
                return (bexpr.operatorToken.kind == SyntaxKind.EqualsToken)
            }
        }

        function fieldIndex(pacc: PropertyAccessExpression) {
            let tp = typeOf(pacc.expression)
            if (isClassType(tp)) {
                let info = getClassInfo(tp)
                let fld = info.allfields.filter(f => (<Identifier>f.name).text == pacc.name.text)[0]
                if (!fld)
                    userError(lf("field {0} not found", pacc.name.text))
                return info.allfields.indexOf(fld)
            } else {
                unhandled(pacc, "bad field access")
            }
        }

        function refSuff(e: Expression) {
            if (isRefType(typeOf(e))) return "Ref"
            else return ""
        }

        function emitStore(expr: Expression) {
            if (expr.kind == SyntaxKind.Identifier) {
                let decl = getDecl(expr)
                if (decl && (decl.kind == SyntaxKind.VariableDeclaration || decl.kind == SyntaxKind.Parameter)) {
                    let l = lookupLocation(decl)
                    recordUse(<VarOrParam>decl, true)
                    l.emitStoreByRef(proc)
                } else {
                    unhandled(expr, "target identifier")
                }
            } else if (expr.kind == SyntaxKind.PropertyAccessExpression) {
                // TODO add C++ support function to simplify this
                let pacc = <PropertyAccessExpression>expr
                let tp = typeOf(pacc.expression)
                let idx = fieldIndex(pacc)
                emit(pacc.expression)
                proc.emit("pop {r0}")
                proc.emit("pop {r1}")
                proc.emit("push {r0}")
                proc.emitInt(idx)
                proc.emit("push {r1}")
                proc.emitCall("bitvm::stfld" + refSuff(expr), 0); // it does the decr itself, no mask
            } else {
                unhandled(expr, "assignment target")
            }

        }

        function handleAssignment(node: BinaryExpression) {
            emit(node.right)
            if (!isBogusReturn(node)) {
                proc.emit("pop {r0}")
                proc.emit("push {r0}")
                proc.emit("push {r0}")
                if (isRefType)
                    proc.emitCallRaw("bitvm::incr");
            }
            emitStore(node.left)
        }

        function emitLazyBinaryExpression(node: BinaryExpression) {
            let lbl = proc.mkLabel("lazy")
            emit(node.left);
            if (node.operatorToken.kind == SyntaxKind.BarBarToken) {
                proc.emitJmp(lbl, "JMPNZ")
            } else if (node.operatorToken.kind == SyntaxKind.AmpersandAmpersandToken) {
                proc.emitJmp(lbl, "JMPZ")
            } else {
                Debug.fail()
            }
            emit(node.right)
            proc.emit("pop {r0}")
            proc.emitLbl(lbl)
            proc.emit("push {r0}")
        }

        function emitBinaryExpression(node: BinaryExpression) {
            if (node.operatorToken.kind == SyntaxKind.EqualsToken) {
                handleAssignment(node);
                return
            }

            let lt = typeOf(node.left)
            let rt = typeOf(node.right)

            let shim = (n: string) => {
                emit(node.left)
                emit(node.right)
                proc.emitCall(n, getMask([node.left, node.right]))
            }

            if ((lt.flags & TypeFlags.Number) && (rt.flags & TypeFlags.Number)) {
                switch (node.operatorToken.kind) {
                    case SyntaxKind.PlusToken:
                        return shim("number::add");
                    case SyntaxKind.MinusToken:
                        return shim("number::subtract");
                    case SyntaxKind.SlashToken:
                        return shim("number::divide");
                    case SyntaxKind.AsteriskToken:
                        return shim("number::multiply");
                    case SyntaxKind.LessThanEqualsToken:
                        return shim("number::le");
                    case SyntaxKind.LessThanToken:
                        return shim("number::lt");
                    case SyntaxKind.GreaterThanEqualsToken:
                        return shim("number::ge");
                    case SyntaxKind.GreaterThanToken:
                        return shim("number::gt");
                    case SyntaxKind.EqualsEqualsToken:
                    case SyntaxKind.EqualsEqualsEqualsToken:
                        return shim("number::eq");
                    case SyntaxKind.ExclamationEqualsEqualsToken:
                    case SyntaxKind.ExclamationEqualsToken:
                        return shim("number::neq");
                    default:
                        unhandled(node.operatorToken, "numeric operator")
                }
            }

            if (node.operatorToken.kind == SyntaxKind.PlusToken) {
                if ((lt.flags & TypeFlags.String) || (rt.flags & TypeFlags.String)) {
                    emitAsString(node.left)
                    emitAsString(node.right)
                    proc.emitCall("string::concat_op", 3)
                    return
                }
            }

            if ((lt.flags & TypeFlags.String) && (rt.flags & TypeFlags.String)) {
                switch (node.operatorToken.kind) {
                    case SyntaxKind.LessThanEqualsToken:
                        return shim("string::le");
                    case SyntaxKind.LessThanToken:
                        return shim("string::lt");
                    case SyntaxKind.GreaterThanEqualsToken:
                        return shim("string::ge");
                    case SyntaxKind.GreaterThanToken:
                        return shim("string::gt");
                    case SyntaxKind.EqualsEqualsToken:
                    case SyntaxKind.EqualsEqualsEqualsToken:
                        return shim("string::equals");
                    case SyntaxKind.ExclamationEqualsEqualsToken:
                    case SyntaxKind.ExclamationEqualsToken:
                        return shim("string::neq");
                    default:
                        unhandled(node.operatorToken, "numeric operator")
                }
            }

            switch (node.operatorToken.kind) {
                case SyntaxKind.EqualsEqualsToken:
                case SyntaxKind.EqualsEqualsEqualsToken:
                    return shim("number::eq");
                case SyntaxKind.ExclamationEqualsEqualsToken:
                case SyntaxKind.ExclamationEqualsToken:
                    return shim("number::neq");
                case SyntaxKind.BarBarToken:
                case SyntaxKind.AmpersandAmpersandToken:
                    return emitLazyBinaryExpression(node);
                default:
                    unhandled(node.operatorToken, "generic operator")
            }
        }

        function emitAsString(e: Expression) {
            emit(e)
            let tp = typeOf(e)
            if (tp.flags & TypeFlags.Number)
                proc.emitCall("number::to_string", 0)
            else if (tp.flags & TypeFlags.Boolean)
                proc.emitCall("boolean::to_string", 0)
            else if (tp.flags & TypeFlags.String) {
                // OK
            } else
                userError(lf("don't know how to convert to string"))
        }
        function emitConditionalExpression(node: ConditionalExpression) { }
        function emitSpreadElementExpression(node: SpreadElementExpression) { }
        function emitYieldExpression(node: YieldExpression) { }
        function emitBlock(node: Block) {
            node.statements.forEach(emit)
        }
        function emitVariableStatement(node: VariableStatement) {
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

        function getLabels(stmt: Node) {
            let id = getNodeId(stmt)
            return {
                fortop: ".fortop." + id,
                cont: ".cont." + id,
                brk: ".brk." + id,
                ret: ".ret." + id
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
            let a = typeOf(node)
            if (!(a.flags & TypeFlags.Void) && !isBogusReturn(node)) {
                if (isRefType(a)) {
                    // will pop
                    proc.emitCall("bitvm::decr", 0);
                } else {
                    proc.emit("pop {r0}")
                }
            }
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

        function emitReturnStatement(node: ReturnStatement) {
            if (node.expression) {
                emit(node.expression)
                proc.emit("pop {r0}")
            } else if (proc.hasReturn()) {
                proc.emit("mov r0, #0 ; return undefined")
            }
            proc.emitJmp(getLabels(proc.action).ret)
        }

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
            let loc = proc.mkLocal(node, getVarInfo(node))
            if (loc.isByRefLocal()) {
                loc.emitClrIfRef(proc) // we might be in a loop
                proc.emitCallRaw("bitvm::mkloc" + loc.refSuff())
                loc.emitStoreCore(proc)
            }
            if (node.initializer) {
                emit(node.initializer)
                loc.emitStoreByRef(proc)
                proc.stackEmpty();
            }
        }
        function emitClassExpression(node: ClassExpression) { }
        function emitClassDeclaration(node: ClassDeclaration) {
            if (node.typeParameters)
                userError(lf("generic classes not supported"))
            if (node.heritageClauses)
                userError(lf("inheritance not supported"))
            node.members.forEach(emit)
        }
        function emitInterfaceDeclaration(node: InterfaceDeclaration) {
            // nothing
        }
        function emitEnumDeclaration(node: EnumDeclaration) { }
        function emitEnumMember(node: EnumMember) { }
        function emitModuleDeclaration(node: ModuleDeclaration) {
            if (node.flags & NodeFlags.Ambient)
                return;
            emit(node.body);
        }
        function emitImportDeclaration(node: ImportDeclaration) { }
        function emitImportEqualsDeclaration(node: ImportEqualsDeclaration) { }
        function emitExportDeclaration(node: ExportDeclaration) { }
        function emitExportAssignment(node: ExportAssignment) { }
        function emitSourceFileNode(node: SourceFile) {
            node.statements.forEach(emit)
        }

        function emitIntLiteral(n: number) {
            proc.emitInt(n)
        }

        function emit(node: Node) {
            try {
                emitNodeCore(node);
            } catch (e) {
                if (!e.bitvmUserError)
                    console.log(e.stack)
                error(node, e.message)
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
                case SyntaxKind.ReturnStatement:
                    return emitReturnStatement(<ReturnStatement>node);
                case SyntaxKind.BinaryExpression:
                    return emitBinaryExpression(<BinaryExpression>node);
                case SyntaxKind.PrefixUnaryExpression:
                    return emitPrefixUnaryExpression(<PrefixUnaryExpression>node);
                case SyntaxKind.PostfixUnaryExpression:
                    return emitPostfixUnaryExpression(<PostfixUnaryExpression>node);
                case SyntaxKind.ElementAccessExpression:
                    return emitIndexedAccess(<ElementAccessExpression>node);
                case SyntaxKind.ParenthesizedExpression:
                    return emitParenExpression(<ParenthesizedExpression>node);
                case SyntaxKind.TypeAssertionExpression:
                    return emitTypeAssertion(<TypeAssertion>node);
                case SyntaxKind.ArrayLiteralExpression:
                    return emitArrayLiteral(<ArrayLiteralExpression>node);
                case SyntaxKind.ClassDeclaration:
                    return emitClassDeclaration(<ClassDeclaration>node);
                case SyntaxKind.PropertyDeclaration:
                case SyntaxKind.PropertyAssignment:
                    return emitPropertyAssignment(<PropertyDeclaration>node);
                case SyntaxKind.NewExpression:
                    return emitNewExpression(<NewExpression>node);
                case SyntaxKind.TypeAliasDeclaration:
                    // skip
                    return
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
                case SyntaxKind.ObjectLiteralExpression:
                    return emitObjectLiteral(<ObjectLiteralExpression>node);
                case SyntaxKind.ShorthandPropertyAssignment:
                    return emitShorthandPropertyAssignment(<ShorthandPropertyAssignment>node);
                case SyntaxKind.ComputedPropertyName:
                    return emitComputedPropertyName(<ComputedPropertyName>node);
                case SyntaxKind.TaggedTemplateExpression:
                    return emitTaggedTemplateExpression(<TaggedTemplateExpression>node);
                case SyntaxKind.AsExpression:
                    return emitAsExpression(<AsExpression>node);
                case SyntaxKind.DeleteExpression:
                    return emitDeleteExpression(<DeleteExpression>node);
                case SyntaxKind.TypeOfExpression:
                    return emitTypeOfExpression(<TypeOfExpression>node);
                case SyntaxKind.VoidExpression:
                    return emitVoidExpression(<VoidExpression>node);
                case SyntaxKind.AwaitExpression:
                    return emitAwaitExpression(<AwaitExpression>node);
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


        export class Location {
            isarg = false;
            iscap = false;

            constructor(public index: number, public def: Declaration, public info: VariableInfo) {
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
                return isLocalVar(this.def) || isParameter(this.def)
            }

            refSuff() {
                if (this.isRef()) return "Ref"
                else return ""
            }

            isByRefLocal() {
                return this.isLocal() && this.info.captured && this.info.written
            }

            emitStoreByRef(proc: Procedure) {
                if (this.isByRefLocal()) {
                    this.emitLoadLocal(proc);
                    proc.emit("pop {r1}");
                    proc.emitCallRaw("bitvm::stloc" + this.refSuff()); // unref internal
                } else {
                    this.emitStore(proc)
                }
            }

            asmref(proc: Procedure) {
                if (this.iscap) {
                    Debug.assert(0 <= this.index && this.index < 32)
                    return "[r5, #4*" + this.index + "]"
                } else if (this.isarg) {
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
                if (this.iscap && proc.binary.finalPass) {
                    debugger
                    Debug.fail("store for captured")
                }

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
                this.emitLoadCore(proc)
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
                Debug.assert(!this.isGlobal() && !this.iscap)
                if (this.isRef() || this.isByRefLocal()) {
                    this.emitLoadCore(proc);
                    proc.emitCallRaw("bitvm::decr");
                }
            }
        }

        export class Procedure {
            numArgs = 0;
            action: FunctionLikeDeclaration;
            info: FunctionInfo;
            seqNo: number;
            lblNo = 0;

            prebody = "";
            body = "";
            locals: Location[] = [];
            captured: Location[] = [];
            args: Location[] = [];
            binary: Binary;

            hasReturn() {
                let sig = checker.getSignatureFromDeclaration(this.action)
                let rettp = checker.getReturnTypeOfSignature(sig)
                return !(rettp.flags & TypeFlags.Void)
            }

            toString() {
                return this.prebody + this.body
            }

            getName() {
                let text = this.action ? (<Identifier>this.action.name).text : null
                return text || "inline"
            }

            mkLocal(def: Declaration, info: VariableInfo) {
                var l = new Location(this.locals.length, def, info)
                //if (def) console.log("LOCAL: " + def.getName() + ": ref=" + def.isByRef() + " cap=" + def._isCaptured + " mut=" + def._isMutable)
                this.locals.push(l)
                return l
            }

            localIndex(l: Declaration, noargs = false): Location {
                return this.captured.filter(n => n.def == l)[0] ||
                    this.locals.filter(n => n.def == l)[0] ||
                    (noargs ? null : this.args.filter(n => n.def == l)[0])
            }

            emitClrs() {
                var lst = this.locals.concat(this.args)
                lst.forEach(p => {
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
                    this.emit("negs r0, r0")
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
            jssource = "";
            finalPass = false;

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
                proc.binary = this
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
                this.jssource = b.js;
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