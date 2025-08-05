#!/usr/bin/env node

/**
 * CodeContextPro-MES CLI Entry Point
 * Launches the CLI application
 */

// Load environment variables (silently for production CLI)  
import * as dotenv from 'dotenv';

// Suppress all dotenv output for cleaner CLI experience
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;

console.log = () => {};
console.info = () => {};
console.warn = () => {};

try {
    dotenv.config();
} catch {
    // Ignore dotenv errors in production CLI
}

console.log = originalLog;
console.info = originalInfo;
console.warn = originalWarn;

import { main } from './index';

// Set environment for CLI execution
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Run the CLI
main(process.argv);