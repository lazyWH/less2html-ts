'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension "less2html" is now active!');
    let previewUri = vscode.Uri.parse("less2html://HTML/html.HTML");
    class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
        public provideTextDocumentContent(uri: vscode.Uri): string {
            // let editor = vscode.window.activeTextEditor;
            // let document = editor.document;
            // let selection = editor.selection;
            // const selectedText = document.getText(selection).trim();

            // return selectedText;
            let selectionLessText = this.getSelectionText();
            return this.convert(selectionLessText);
        }
        convert(selectionLessText:string):string{
                // The code you place here will be executed every time your command is executed
                if (this.checkBracketsEqual(selectionLessText)) {
                    vscode.window.showErrorMessage('left Brackets nums is not Equal right Brackets nums,please check selected text')
                }
                let result;
                let HTML = '';
                console.log(result)
                try {
                    result = this.convertToTree(selectionLessText);
                    if(result.child.length===1){
                        HTML = this.generateHTML(result.child[0],0);
                    }else{
                        for(let i = 0;i<result.child.length;i++)
                            HTML += this.generateHTML(result.child[i],0);
                    }
                } catch (e) {
                    // console.log(e);
                }
                return HTML;                
                
                
        }
        convertToTree(finalSourceText) {
            //1.start with class name(.) or id(#)name ,end with { ,or less function start whit (.)，end with (\(\)){  2.less reserved word (&),end with {  3.HTML tag  name 
            let regexp = new RegExp(/([.#][-\w:()]+(?={))|(&.*?(?={))|([a-z]+(?={))|}/, 'g');
            // let regexp = new RegExp(/([.#].*?(?={))|(&.*?(?={))|([a-z]+(?={))|}/, 'g');
            let arr,stack = [],testArr = [];
            let root = {type:'id',value:'root',nodeName:'div',child:[]};
            stack.push(root);
            const config = vscode.workspace.getConfiguration('less2html');
            const nodeName = config.get('nodeName')
            const className = config.get('className')
            while ((arr = regexp.exec(finalSourceText)) !== null) {
                //  console.log(`Found ${arr[0]}. Next starts at ${regexp.lastIndex}.`);
                let text = arr[0];
                //if not match{，push Matching text to stack
                if(text!=='}'){
                    let node = {child:[],type:'',value:'',nodeName:''}
                    node.type = this.getType(text,className);
                    node.value = this.getValue(text);
                    node.nodeName = node.type==='tag'?text:nodeName
                    testArr.push(`${text},type:${node.nodeName}`)
                    
                    stack.push(node);
                }else{
                    let node = stack.pop();
                    let parent = stack[stack.length-1];
                    parent.child.push(node);
                }
             
            }
            // console.log('filterArr',testArr);
            
        
        
            return root;
        }
        generateHTML(tree,level){
            const {child} = tree;
            if(child.length===0) return `\n${' '.repeat(level*4)}<${tree.nodeName} ${tree.type!=='tag'?`${tree.type}='${tree.value}'`:''}></${tree.nodeName}>`;
            let html = '';
            for(let i = 0 ;i<child.length;i++){
                html += this.generateHTML(child[i],level+1);
            }
            return `\n${' '.repeat(level*4)}<${tree.nodeName} ${tree.type!=='tag'?`${tree.type}='${tree.value}'`:''}>${html}\n${' '.repeat(level*4)}</${tree.nodeName}>`;
        }
        getType(text,className){
            let type ;
            if(text[0] ==='.'){
                if(/\(\)/.test(text)){
                    type = 'function'
                }else{
                    type = className
                }
            }else if( text[0] ==='#'){
                type = 'id'
            }else if(text[0] ==='&'){
                type = 'reverse'
            }else{
                type = 'tag'
            }
            return type;
        }
        getValue(text){
            if(text.length===1) return text;
            let index = text.indexOf(':');
            let end = text.length;
            if(index!==-1) end = index;
            return text.slice(1,end)
        }
        checkBracketsEqual(finalText) {
            let leftBrackets = finalText.match(/{/g);
            let rightBrackets = finalText.match(/}/g);
            return leftBrackets.length !== rightBrackets.length;
        }
        getSelectionText():string {
            let editor = vscode.window.activeTextEditor;
            let document = editor.document;
            let sel = editor.selections;
            let txt = document.getText(new vscode.Range(sel[0].start, sel[0].end));
            return this.wipeBackdrop(txt);
        }
        wipeBackdrop(selectionLessText:string) :string {
            // Remove all annotations
            let textWithoutAnnotation = selectionLessText.replace(/\/\/.*\n/g, '');
            //Remove all spaces
            let textWithoutSpace = textWithoutAnnotation.replace(/\s+/g, '');
            //Remove color values, and decimal
            // return  textWithoutSpace.replace(/(#\w+(?!{))|([.]\d+)/g, '');
            return  textWithoutSpace.replace(/([.]\d+)/g, '');
        
        }
        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }

        public update(uri: vscode.Uri) {
            this._onDidChange.fire(uri);
        }

    }
    let provider = new TextDocumentContentProvider();
    let registration = vscode.workspace.registerTextDocumentContentProvider(
        "less2html",
        provider
      );
    vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
		if (e.textEditor === vscode.window.activeTextEditor) {
			provider.update(previewUri);
		}
	})
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.generateHTML', () => {
        vscode.workspace.openTextDocument(previewUri).then(doc => vscode.window.showTextDocument(doc,vscode.ViewColumn.Two));
    });

    context.subscriptions.push(disposable,registration);
}

// this method is called when your extension is deactivated
export function deactivate() {
}