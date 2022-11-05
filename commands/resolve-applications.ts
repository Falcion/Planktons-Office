/*
 * General function of creating and sending application into the server.
 =========================================================================
 * ID: APPLICATION,
 * DM: NONE,
 * DESC: initializes the application collection process and creates ticket 
 *       for you to write the necessary information.
 */

import { COMMAND_NAME, COMMAND_DM } from './context/resolve-applications.ts.json';

/* ======================================================================= */

import { PrismaClient } from '@prisma/client';

import * as RU_LOCALES from '../data/locales/ru.json';
import * as EN_LOCALES from '../data/locales/en.json';

import * as fs from 'fs-extra';

module.exports = {

}

