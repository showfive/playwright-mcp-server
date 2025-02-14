/**
 * 人間らしい操作をエミュレートするための遅延を提供するユーティリティモジュール
 */

/**
 * ランダムな遅延時間（100-300ms）で待機します
 */
export const humanDelay = async (): Promise<void> => {
    const min = 100;
    const max = 300;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 指定された範囲内でランダムな遅延時間で待機します
 * @param minDelay 最小遅延時間（ミリ秒）
 * @param maxDelay 最大遅延時間（ミリ秒）
 */
export const customHumanDelay = async (minDelay: number, maxDelay: number): Promise<void> => {
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
};