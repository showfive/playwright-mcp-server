/// <reference types="jest" />

// Playwrightのために必要なグローバル関数を定義
global.setImmediate = global.setImmediate || ((fn: (...args: any[]) => void, ...args: any[]) => global.setTimeout(fn, 0, ...args));
global.clearImmediate = global.clearImmediate || global.clearTimeout;

// Increase timeout for Playwright operations
jest.setTimeout(35000);

// Add custom matchers if needed
expect.extend({
    toBeVisible(received) {
        const pass = received && received.isVisible;
        if (pass) {
            return {
                message: () => `expected element not to be visible`,
                pass: true
            };
        } else {
            return {
                message: () => `expected element to be visible`,
                pass: false
            };
        }
    },

    toHaveAttribute(received, attr: string, value?: string) {
        const attributes = received && received.attributes;
        const hasAttr = attributes && attributes[attr] !== undefined;
        const matchesValue = value === undefined || attributes[attr] === value;
        const pass = hasAttr && matchesValue;

        if (pass) {
            return {
                message: () =>
                    `expected element not to have attribute ${attr}${
                        value !== undefined ? ` with value ${value}` : ''
                    }`,
                pass: true
            };
        } else {
            return {
                message: () =>
                    `expected element to have attribute ${attr}${
                        value !== undefined ? ` with value ${value}` : ''
                    }`,
                pass: false
            };
        }
    }
});

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeVisible(): R;
            toHaveAttribute(attr: string, value?: string): R;
        }
    }
}

export {};