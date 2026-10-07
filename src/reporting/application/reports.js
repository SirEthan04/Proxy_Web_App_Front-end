export const getEntries = (operations) => {
    return operations.filter(
        operation => operation.type === 'Entrada'
    )
}

export const getExits = (operations) => {
    return operations.filter(
        operation => operation.type === 'Salida'
    )
}

export const getTotalProducts = (products) => {
    return products.length
}

export const getTotalOperations = (operations) => {
    return operations.length
}

export const getTotalWastes = (wastes) => {
    return wastes.length
}