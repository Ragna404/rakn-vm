/**
 * File Controller
 * Handlers for virtual guest file system endpoints.
 */

const fileService = require('../services/fileService');
const { handleError } = require('../middleware/errorMiddleware');

function listFiles(req, res) {
  try {
    const dirPath = req.query.path || '/home/user';
    const data = fileService.listDirectory(dirPath);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
}

function getFileContent(req, res) {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing required query param: path' });
    }
    const data = fileService.readFile(filePath);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
}

function saveFileContent(req, res) {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing required body param: path' });
    }
    const data = fileService.writeFile(filePath, content);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = {
  listFiles,
  getFileContent,
  saveFileContent,
};
