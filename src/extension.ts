'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// The module 'azdata' contains the Azure Data Studio extensibility API
// This is a complementary set of APIs that add SQL / Data-specific functionality to the app
// Import the module and reference it with the alias azdata in your code below

import * as azdata from 'azdata';
import { error } from 'console';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Extension "ads-drop-database" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    context.subscriptions.push(vscode.commands.registerCommand('ads-drop-database.dropdatabase', (node: azdata.ObjectExplorerContext) => {
        let dbName = node.nodeInfo?.metadata?.name;
        let systemDbs = ['master','model','msdb','tempdb'];

        if (!dbName) {
            vscode.window.showErrorMessage('No Database Selected!');

        } else if(systemDbs.includes(dbName)){
            vscode.window.showErrorMessage(`Cannot Drop System Database - ${dbName}`);

        } else {
            vscode.window.showWarningMessage(`Drop Database "${dbName}"?`, "Yes", "No").then(value => {
                if (value === "Yes") {
                    dropDatabase(node.connectionProfile, dbName).then(() => {
                        refreshDatabases(node.connectionProfile?.id, node.nodeInfo?.nodePath);
                    });
                }
            });
            
        }
    }));

    /* context.subscriptions.push(vscode.commands.registerCommand('ads-drop-database.showCurrentConnection', () => {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        azdata.connection.getCurrentConnection().then(connection => {
            let connectionId = connection ? connection.connectionId : 'No connection found!';
            vscode.window.showInformationMessage(connectionId);
        }, error => {
             console.error(error);
        });
    })); */
}

function refreshDatabases(connectionId?: string, nodePath?: string) {
    if (connectionId) {
        azdata.objectexplorer.getNode(connectionId, nodePath)
        .then(node => {
            node.getParent()
            .then(parent => {
                parent.refresh();
            });
        });
    }
}

function dropDatabase(connectionProfile?: azdata.IConnectionProfile, dbName?: string) {
    return new Promise<void>((resolve, reject) => {
        if (!connectionProfile){
            vscode.window.showErrorMessage("Invalid Connection State.");
            reject();
        } else {
            azdata.connection.connect(connectionProfile, false, false).then(connectionResult => {
                azdata.connection.getUriForConnection(connectionResult.connectionId).then(connectionUri => {
                    let queryProvider: azdata.QueryProvider = azdata.dataprotocol.getProvider("MSSQL", azdata.DataProviderType.QueryProvider);

                    queryProvider.runQueryString(connectionUri, `ALTER DATABASE "${dbName}" SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE "${dbName}"`)
                    .then(() => {
                        let connectionProvider: azdata.ConnectionProvider = azdata.dataprotocol.getProvider("MSSQL", azdata.DataProviderType.ConnectionProvider);
                        connectionProvider.disconnect(connectionUri);
                        resolve();
                    }, error => {
                        vscode.window.showErrorMessage("Cannot Drop Database.  Check console for error log.");
                        console.error(error);
                        reject();
                    });
                });
            });
        }
    });
}
// this method is called when your extension is deactivated
export function deactivate() {
}

