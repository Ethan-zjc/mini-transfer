const { getQuestions } = require('./questions');
const parse = require('./parse');
const stringify = require('./stringify');
const wxmlTo = require('./wxmlTo');
const envView = require('./envView');
const {
    isDirectory,
    isFolderEmpty,
    createDirectory,
    readDirectory,
    copyFile,
    replaceContent,
    isWin,
    saveLog,
    getPlugins,
    mergeJSON,
    getContent,
    getContentSync,
    saveFile,
    object2String,
    toVFile,
    transformCssStaticUrl,
    getHtmlParser,
    getNodeMethodName,
    getFileType,
    getFiles,
    isJsonStr,
    formatContent,
} = require('./tools');

module.exports = {
    getQuestions,
    isDirectory,
    isFolderEmpty,
    createDirectory,
    readDirectory,
    copyFile,
    replaceContent,
    isWin,
    saveLog,
    getPlugins,
    mergeJSON,
    getContent,
    getContentSync,
    saveFile,
    object2String,
    toVFile,
    transformCssStaticUrl,
    getHtmlParser,
    getNodeMethodName,
    getFileType,
    getFiles,
    isJsonStr,
    parse,
    stringify,
    wxmlTo,
    envView,
    formatContent,
};
