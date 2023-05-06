import { _postData } from "./interface/postEvent";
// import { jsonMessage } from "./interface/lineMessage";
import { embeddingResponse } from "./interface/chatGPT";

const GPT_TOKEN = PropertiesService.getScriptProperties().getProperty('GPTKEY'); //ChatGPTのAPIキーを入れてください
const EMBEDDING_ENDPOINT = 'https://api.openai.com/v1/embeddings';
const MODEL_NAME = 'text-embedding-ada-002';
const SPREAD_SHEET = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEETKEY') as string);

async function createEmbedding(input: string) {
    try {
        const headers = {
            'Authorization': 'Bearer ' + GPT_TOKEN,
            'Content-type': 'application/json',
        };
        // リクエストオプション
        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            'method': 'post',
            'muteHttpExceptions': true,
            'headers': headers,
            'payload': JSON.stringify({
                'model': MODEL_NAME,        // 使用するGPTモデル
                'input': input
            })
        };
        // HTTPリクエストでChatGPTのAPIを呼び出す
        const res = JSON.parse(UrlFetchApp.fetch(EMBEDDING_ENDPOINT, options).getContentText()) as embeddingResponse;
        return res.data[0].embedding;
    } catch (e) {
        console.log(e)
        throw e
    }
}

async function createVector() {
    const input = [
        '株式会社エンラプトの設立は 2011年9月 です。',
        '株式会社エンラプトの資本金は 9,000,000円 です。',
        '株式会社エンラプトの代表者は ジェイソン　パーク と ケント　ホーング です。',
        '株式会社エンラプトの従業員数は 約30名 です。',
        '株式会社エンラプトの住所は 東京都港区六本木1-9-10 アークヒルズ仙石山森タワー25階 です。',
        '株式会社エンラプトの連絡先は 電話:03-5544-8218、メール:info@enrapt.jp です。',
        'エンラプトは計画立案からサービス公開へ至るプロジェクトライフサイクルの全てのエリアに対してITコンサルティングサービスをご提供しております。',
        'エンラプトはプロジェクト計画をサービスとして提供しています。具体的にはプロジェクトの範囲、深度とスケジュール作成、ソリューションアーキテクチャの定義と実現可能性の検証、プロジェクト管理スタイル（アジャイル/スクラム）の設定とプロジェクトチームのアサインを行います。',
        'エンラプトはプロジェクト運営をサービスとして提供しています。具体的には開発スケジュール作成と報告会議体の設定、プロダクトバックログ作成、設計ドキュメント作成、アウトプットの定義を行います。',
        'エンラプトはラピッド開発をサービスとして提供しています。具体的にはプロダクトバックログに基づく設計ドキュメントの詳細化、インクリメンタル開発とテストを行います。',
    ];
    const promised = input.map(async i => {
        return {
            text: i,
            vector: await createEmbedding(i)
        };
    });
    return await Promise.all(promised);
}

// シートの削除
function deleteSheet(sheetName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let sheet = SPREAD_SHEET.getSheetByName(sheetName);
        if (sheet != null) {
            SPREAD_SHEET.deleteSheet(sheet);
            Logger.log(sheetName + "を削除しました。");
        } else {
            Logger.log(sheetName + "は存在しません。");
        }
        resolve();
    });
}

// シートの作成
function createNewSheetAtTop(sheetName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let newSheet = SPREAD_SHEET.insertSheet(0);
        newSheet.setName(sheetName);
        newSheet.getRange(1, 1, 1, 3).setValues([["項目No", "学習内容", "ベクトル"]]);
        resolve();
    })
}

createVector().then(async (vectors) => {
    await deleteSheet('embedding');
    await createNewSheetAtTop('embedding');

    const embeddingSheet = SPREAD_SHEET.getSheetByName('embedding') as GoogleAppsScript.Spreadsheet.Sheet;
    let addColumns = false;

    vectors.forEach((vector, i) => {
        const embeddingLastRow = embeddingSheet.getLastRow();
        embeddingSheet.getRange(embeddingLastRow + 1, 1).setValue(i + 1);
        embeddingSheet.getRange(embeddingLastRow + 1, 2).setValue(vector.text);
        writeVector(embeddingLastRow, vector.vector);
    })

    function writeVector(lastRow: number, vector: number[]) {
        if (addColumns == false) {
            embeddingSheet.insertColumnsBefore(4, vector.length);
            addColumns = true;
        }
        for (let i = 0; i < vector.length - 1; i++) {
            embeddingSheet.getRange(lastRow + 1, 3 + i).setValue(vector[i]);
        }
    }
});

// async function getRelevantContexts(contexts: contexts[], message: string) {
//     // 前提知識の配列ベクトルと質問文ベクトルの内積を計算
//     function dot(a: number[], b: number[]): number {
//         return a.map((x, i) => {
//             return a[i] * b[i];
//         }).reduce((m, n) => {
//             return m + n;
//         })
//     }

//     const messageVec = await createEmbedding(message);

//     return contexts.map((context) => {
//         return {
//             ...context,
//             similarity: dot(messageVec, context.vector)
//         }
//     }).sort((a, b) => {
//         return b.similarity - a.similarity
//     }).slice(0, 3).map((i) => {
//         return i.text
//     })
// }