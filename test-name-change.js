#!/usr/bin/env node

// Test script to demonstrate the name change workflow
// Edgit: id=tkkm7t version=1.0.0 component=test-name-change-agent

console.log('This is a test component with the original name');

function greet(name) {
  return `Hello, ${name}!`;
}

module.exports = { greet };