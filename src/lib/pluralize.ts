/**
 * Утилита для склонения слов по числам в русском языке
 * 
 * @param n - число
 * @param forms - массив из трёх форм слова: [одна, две-четыре, много]
 * @example pluralize(1, ['токен', 'токена', 'токенов']) // "1 токен"
 * @example pluralize(2, ['токен', 'токена', 'токенов']) // "2 токена"
 * @example pluralize(5, ['токен', 'токена', 'токенов']) // "5 токенов"
 */
export function pluralize(n: number, forms: [string, string, string]): string {
    const mod10 = Math.abs(n) % 10;
    const mod100 = Math.abs(n) % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return `${n} ${forms[0]}`;
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return `${n} ${forms[1]}`;
    }
    return `${n} ${forms[2]}`;
}

/**
 * Готовые склонения для токенов
 */
export function pluralizeTokens(n: number): string {
    return pluralize(n, ['токен', 'токена', 'токенов']);
}

/**
 * Готовые склонения для изображений
 */
export function pluralizeImages(n: number): string {
    return pluralize(n, ['изображение', 'изображения', 'изображений']);
}

/**
 * Готовые склонения для кредитов
 */
export function pluralizeCredits(n: number): string {
    return pluralize(n, ['кредит', 'кредита', 'кредитов']);
}
