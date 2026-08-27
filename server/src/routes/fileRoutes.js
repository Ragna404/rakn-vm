/**
 * File API Routes
 * Endpoints for navigating, reading, and editing guest VM files.
 */

const { Router } = require('express');
const fileController = require('../controllers/fileController');

const router = Router();

router.get('/list', fileController.listFiles);
router.get('/read', fileController.getFileContent);
router.post('/write', fileController.saveFileContent);

module.exports = router;
