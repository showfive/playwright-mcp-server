import { checkVisibility, isInViewport } from '../visibility.js';

describe('Visibility Utils', () => {
    describe('checkVisibility', () => {
        it('should detect visible elements', () => {
            const style = {
                display: 'block',
                visibility: 'visible',
                opacity: '1'
            } as CSSStyleDeclaration;

            expect(checkVisibility(style)).toBe(true);
        });

        it('should detect hidden elements', () => {
            const hiddenStyles = [
                { display: 'none', visibility: 'visible', opacity: '1' },
                { display: 'block', visibility: 'hidden', opacity: '1' },
                { display: 'block', visibility: 'visible', opacity: '0' }
            ] as CSSStyleDeclaration[];

            hiddenStyles.forEach(style => {
                expect(checkVisibility(style)).toBe(false);
            });
        });
    });

    describe('isInViewport', () => {
        const windowSize = { width: 1024, height: 768 };

        it('should detect elements in viewport', () => {
            const rect = {
                top: 100,
                left: 100,
                right: 200,
                bottom: 200
            } as DOMRect;

            expect(isInViewport(rect, windowSize)).toBe(true);
        });

        it('should detect elements outside viewport', () => {
            const outsideRects = [
                { top: -100, left: 0, right: 100, bottom: 0 },
                { top: 0, left: -100, right: 0, bottom: 100 },
                { top: 0, left: 0, right: 1100, bottom: 100 },
                { top: 0, left: 0, right: 100, bottom: 800 }
            ] as DOMRect[];

            outsideRects.forEach(rect => {
                expect(isInViewport(rect, windowSize)).toBe(false);
            });
        });
    });
});