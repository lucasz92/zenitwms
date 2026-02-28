/**
 * Ejecuta una promesa con timeout.
 * Si la DB no responde, retorna el fallback en lugar de colgar la página.
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    fallback: T,
    ms = 5000
): Promise<T> {
    const timeout = new Promise<T>((resolve) =>
        setTimeout(() => resolve(fallback), ms)
    );
    return Promise.race([promise, timeout]);
}
