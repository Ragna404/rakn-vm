/**
 * VM API Routes
 * Mounts handlers from VM controller and connects validation & auth middlewares.
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireVmParams, validateSerialPort } = require('../middleware/validateMiddleware');
const vmController = require('../controllers/vmController');

const router = Router();

// Apply auth and param validation to all VM routes
router.use(requireAuth, requireVmParams);

router.get('/status', vmController.getStatus);
router.get('/details', vmController.getDetails);

router.post('/start', vmController.handleAction('start'));
router.post('/stop', vmController.handleAction('stop'));
router.post('/reset', vmController.handleAction('reset'));
router.post('/suspend', vmController.handleAction('suspend'));
router.post('/resume', vmController.handleAction('resume'));

router.get('/serial-port', validateSerialPort, vmController.getSerialPort);

module.exports = router;
