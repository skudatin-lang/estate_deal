/*
FLOW ENGINE V5 - ИСПРАВЛЕНО ЗАДВОЕНИЕ СУММ (СТРОГОЕ ПРИСВАИВАНИЕ)
*/
const FlowEngine = (() => {
    function build(deal) {
        if (!deal || !deal.objects) return;

        reset(deal);
        calculateTransitions(deal);
        calculateIncoming(deal);
        calculateSellerBalances(deal);
        syncBuyersFromTransitions(deal);
    }

    function reset(deal) {
        deal.objects.forEach(object => {
            object.incomingTransitions = [];
            object.incomingAmount = 0;
            
            if (object.sellers) {
                object.sellers.forEach(seller => {
                    seller.calculatedTransit = 0;
                    seller.calculatedRemainder = 0;
                });
            }
        });
    }

    function calculateTransitions(deal) {
        deal.objects.forEach(sourceObject => {
            if (!sourceObject.sellers) return;
            
            sourceObject.sellers.forEach(seller => {
                if (!seller.transitions) return;
                
                seller.transitions.forEach(transition => {
                    if (!transition.toObjectId) return;

                    const targetObject = deal.objects.find(
                        x => String(x.id) === String(transition.toObjectId)
                    );

                    if (!targetObject) return;

                    const amount = Number(transition.amount) || 0;
                    seller.calculatedTransit += amount;

                    if (!targetObject.incomingTransitions) {
                        targetObject.incomingTransitions = [];
                    }
                    
                    targetObject.incomingTransitions.push({
                        sellerId: seller.id,
                        sellerName: seller.name,
                        amount: amount
                    });
                });
            });
        });
    }

    function calculateIncoming(deal) {
        deal.objects.forEach(object => {
            object.incomingAmount = (object.incomingTransitions || []).reduce(
                (sum, row) => sum + (Number(row.amount) || 0),
                0
            );
        });
    }

    function calculateSellerBalances(deal) {
        deal.objects.forEach(object => {
            if (!object.sellers) return;
            
            object.sellers.forEach(seller => {
                const received = Number(seller.netAmount) || 0;
                const transit = Number(seller.calculatedTransit) || 0;
                seller.calculatedRemainder = Math.max(0, received - transit);
            });
        });
    }

    function syncBuyersFromTransitions(deal) {
        deal.objects.forEach(targetObject => {
            if (!targetObject.incomingTransitions || targetObject.incomingTransitions.length === 0) return;
            
            // Группируем переходы по имени продавца, чтобы корректно обработать несколько переходов от одного лица
            const transitionsBySeller = {};
            targetObject.incomingTransitions.forEach(t => {
                if (!transitionsBySeller[t.sellerName]) {
                    transitionsBySeller[t.sellerName] = 0;
                }
                transitionsBySeller[t.sellerName] += Number(t.amount) || 0;
            });

            for (const [sellerName, totalAmount] of Object.entries(transitionsBySeller)) {
                if (!targetObject.buyers) {
                    targetObject.buyers = [];
                }
                
                let existingBuyer = targetObject.buyers.find(b => b.name === sellerName);
                
                if (existingBuyer) {
                    // СТРОГОЕ ПРИСВАИВАНИЕ, А НЕ СЛОЖЕНИЕ (исключает задвоение)
                    existingBuyer.ownFunds = totalAmount;
                    existingBuyer.name = sellerName;
                } else {
                    const newBuyer = DealModel.createBuyer();
                    newBuyer.name = sellerName;
                    newBuyer.ownFunds = totalAmount;
                    newBuyer.additionalOwnFunds = 0;
                    newBuyer.mortgageFunds = 0;
                    if (!newBuyer.agent) newBuyer.agent = { name: "", commission: 0 };
                    
                    targetObject.buyers.push(newBuyer);
                }
            }
        });
    }

    function incomingAmount(object) {
        return Number(object?.incomingAmount || 0);
    }

    function targetObjects(seller) {
        if (!seller || !seller.transitions) return [];
        return seller.transitions.map(x => x.toObjectId).filter(id => id);
    }

    function ensureBuyerLink(deal) {
        syncBuyersFromTransitions(deal);
    }

    return {
        build,
        incomingAmount,
        targetObjects,
        ensureBuyerLink,
        syncBuyersFromTransitions
    };
})();