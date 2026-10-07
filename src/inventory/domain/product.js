export const getProductStatus = (stock) => {
    if (stock <= 0) {
        return 'Sin stock'
    }

    if (stock <= 5) {
        return 'Stock bajo'
    }

    return 'Activo'
}