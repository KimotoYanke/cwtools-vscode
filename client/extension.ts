/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { workspace, ExtensionContext, window, Disposable, Position, Uri, WorkspaceEdit, TextEdit, Range, commands, ViewColumn } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, NotificationType, RequestType } from 'vscode-languageclient';
import { create } from 'domain';

let defaultClient: LanguageClient;

export function activate(context: ExtensionContext) {

	class CwtoolsProvider
	{
		private disposables: Disposable[] = [];

		constructor(){
			workspace.registerTextDocumentContentProvider("cwtools", this)
		}
		async provideTextDocumentContent(_: Uri): Promise<string> {
			return '';
		}

		dispose(): void {
			this.disposables.forEach(d => d.dispose());
		}
	}

	// The server is implemented using dotnet core
	//let serverDll = context.asAbsolutePath(path.join('src', 'Main', 'bin', 'Debug', 'netcoreapp2.0', 'Main.dll'));
	var serverExe : string;
	if(os.platform() == "win32"){
		serverExe = context.asAbsolutePath(path.join('out', 'server','win-x64', 'Main.exe'))
	}
	else if (os.platform() == "darwin"){
		serverExe = context.asAbsolutePath(path.join('out', 'server','osx.10.11-x64', 'Main'))
		fs.chmodSync(serverExe, '755');
	}
	else{
		serverExe = context.asAbsolutePath(path.join('out', 'server','linux-x64', 'Main'))
		fs.chmodSync(serverExe, '755');
	}
	
	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { command: serverExe, transport: TransportKind.stdio },
		debug : { command: serverExe, transport: TransportKind.stdio }
		//debug : { command: 'dotnet', args: [serverDll], transport: TransportKind.stdio }
		// debug : { command: 'dotnet', args: [serverDll], transport: TransportKind.stdio }
	}
	
	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for F# documents
		documentSelector: [{scheme: 'file', language: 'paradox'}],
		synchronize: {
			// Synchronize the setting section 'languageServerExample' to the server
			configurationSection: 'cwtools',
			// Notify the server about file changes to F# project files contain in the workspace
			
			fileEvents: workspace.createFileSystemWatcher(path.join(workspace.workspaceFolders[0].uri.fsPath, '**/{events, common}/**/*.txt'))
		}
	}
	
	let client = new LanguageClient('cwtools', 'Paradox Language Server', serverOptions, clientOptions);
	defaultClient = client;
	console.log("client init")
	client.registerProposedFeatures();
	let notification = new NotificationType<boolean, void>('loadingBar');
	interface CreateVirtualFile { uri : string; fileContent : string }
	let createVirtualFile = new NotificationType<CreateVirtualFile, void>('createVirtualFile');
	let request = new RequestType<Position, string, void, void>('getWordRangeAtPosition');
	let status : Disposable;
	client.onReady().then(() => {
		client.onNotification(notification, (param : any) =>{
			if(param.value){
				status = window.setStatusBarMessage("Loading files...");
			}
			else if(status !== undefined){
				status.dispose();
			}
		})
		client.onNotification(createVirtualFile, (param : CreateVirtualFile) => {
			let uri = Uri.parse(param.uri);
			let doc = workspace.openTextDocument(uri).then(doc => {
				let edit = new WorkspaceEdit();
				let range = new Range(0, 0, doc.lineCount, doc.getText().length);
				edit.set(uri, [new TextEdit(range, param.fileContent)]);
				workspace.applyEdit(edit);
				window.showTextDocument(uri);
				//commands.executeCommand('vscode.previewHtml', uri, ViewColumn.One, "localisation");
			});
		})
		client.onRequest(request, (param : any, _) => {
			console.log("recieved request " + request.method + " "+ param)
			let document = window.activeTextEditor.document;
			let position = new Position(param.position.line, param.position.character)
			let wordRange = document.getWordRangeAtPosition(position);
			if(wordRange === undefined){
				return "";
			}
			else{
				return document.getText(wordRange);
			}
		})		
	})
	let disposable = client.start();
	
	// Create the language client and start the client.
	
	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable);
	context.subscriptions.push(new CwtoolsProvider());
}

export default defaultClient;