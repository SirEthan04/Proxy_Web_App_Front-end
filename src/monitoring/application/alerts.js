export const getOutOfStockProducts = (products) => {
    return products.filter(
        product => Number(product.stock) <= 0
    )
}

export const getLowStockProducts = (products) => {
    return products.filter(
        product =>
            Number(product.stock) > 0 &&
            Number(product.stock) <= 5
    )
}

export const getExpiredProducts = (products) => {
    const today = new Date()

    return products.filter(product => {
        if (!product.expirationDate) {
            return false
        }

        const expirationDate = new Date(product.expirationDate)

        return expirationDate < today
    })
}

export const getExpiringProducts = (products) => {
    const today = new Date()

    return products.filter(product => {
        if (!product.expirationDate) {
            return false
        }

        const expirationDate = new Date(product.expirationDate)

        const difference = expirationDate - today

        const days = Math.ceil(
            difference / (1000 * 60 * 60 * 24)
        )

        return days >= 0 && days <= 7
    })
}