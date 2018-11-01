const request = require('request');

// https://developers.kloudless.com/docs/v1/storage#files-download-a-file

function StorageFile(fileId, account)
{
    this.account = account || process.env.STORAGE_ACCOUNT_ID;
    this.fileId = fileId.trim();

    if(!this.account)
        throw new Error('Invalid env variable STORAGE_ACCOUNT_ID');
    if(!StorageFile.apiKey)
        throw new Error('Invalid env variable STORAGE_API_KEY');
}
StorageFile.apiKey = process.env.STORAGE_API_KEY;
StorageFile.prototype.request = function(options, callback) {
    if(!StorageFile.apiKey)
        throw new Error('Invalid env variable STORAGE_API_KEY');
    
    if(!options.headers)
        options.headers = {};
    options.headers.Authorization = 'APIKey ' + StorageFile.apiKey;
    
    return request(options, callback);
}
StorageFile.prototype.setContent = function(content, callback) {
    const stream = this.request({
        url: `https://api.kloudless.com/v1/accounts/${this.account}/storage/files/${this.fileId}`,
        method: 'PUT'
    }, callback);
    
    stream.end(content);
}
StorageFile.prototype.getContent = function(callback) {
    return this.request({
        url: `https://api.kloudless.com/v1/accounts/${this.account}/storage/files/${this.fileId}/contents`,
        method: 'GET'
    }, (e, res, body) => {
        callback(e, body)
    });
}

module.exports = StorageFile;



require('isomorphic-fetch');
const Dropbox = require('dropbox').Dropbox;

// https://developers.kloudless.com/docs/v1/storage#files-download-a-file

function StorageFile(fileId)
{
    this.fileId = fileId.trim();

    if(!StorageFile.apiKey)
        throw new Error('Invalid env variable STORAGE_API_KEY');
}
StorageFile.apiKey = process.env.STORAGE_API_KEY;
StorageFile.dbx = function() {
    if(!StorageFile._dbx)
        StorageFile._dbx = new Dropbox({ accessToken: StorageFile.apiKey });
    return StorageFile._dbx;
}
StorageFile.prototype.setContent = function(content, callback) {
    const dbx = StorageFile.dbx();
    dbx.filesUpload({
        path: this.fileId,
        contents: content,
        mode: {
            '.tag': 'overwrite'
        }
    }).then(() => {
        callback();
    }).catch((e) => {
        console.error(e);
        callback(e);
    });
}
StorageFile.prototype.getContent = function(callback) {
    StorageFile.dbx().filesDownload({
        path: this.fileId
    }).then((r) => {
        console.log(r.fileBinary.toString());
        callback(undefined, r.fileBinary);
    }).catch((e) => {
        console.error(e);
        callback(e);
    });
}

module.exports = StorageFile;
