const { Router } = require('express');
const controller = require('../controllers/healthController');
const router = Router();
router.get('/', controller.obter);
module.exports = router;
