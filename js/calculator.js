/*
CALCULATOR V4 - ИСПРАВЛЕНА ЛОГИКА СОБСТВЕННЫХ СРЕДСТВ
*/
const DealCalculator = (() => {
    function rebuild(deal) {
        if (!deal || !deal.objects) {
            console.error("DealCalculator: invalid deal object");
            return;
        }

        try {
            calculateSellers(deal);
            FlowEngine.build(deal);
            calculateObjects(deal);
            calculateSummary(deal);
        } catch (error) {
            console.error("Ошибка в калькуляторе: ", error);
        }
    }

    function calculateSellers(deal) {
        if (!deal.objects) return;
        
        deal.objects.forEach(object => {
            if (!object) return;
            
            const price = safeNumber(object.price, 0);

            if (!object.sellers) return;
            
            object.sellers.forEach(seller => {
                if (!seller) return;
                
                const share = safeNumber(seller.share, 0);
                const gross = price * (share / 100);
                const commission = safeNumber(seller.agent?.commission, 0);
                
                seller.grossAmount = gross;
                seller.netAmount = Math.max(0, gross - commission);
            });
        });
    }

    function calculateObjects(deal) {
        if (!deal.objects) return;
        
        deal.objects.forEach(object => {
            if (object) {
                calculateObject(object);
            }
        });
    }

    function calculateObject(object) {
        if (!object) return;
        
        object.accounts = [];

        const price = safeNumber(object.price, 0);
        const totalAdvances = getAdvances(object);
        const transit = FlowEngine.incomingAmount(object);

        let ownFundsFromBuyer = 0;
        let additionalOwnFunds = 0;
        let buyerAgentCommission = 0;

        if (object.buyers && Array.isArray(object.buyers)) {
            object.buyers.forEach(buyer => {
                if (!buyer) return;
                
                ownFundsFromBuyer += safeNumber(buyer.ownFunds, 0);
                additionalOwnFunds += safeNumber(buyer.additionalOwnFunds, 0);
                buyerAgentCommission += safeNumber(buyer.agent?.commission, 0);
            });
        }

        // 1. АВАНСЫ
        if (object.advances && object.advances.length > 0) {
            object.advances.forEach(advance => {
                const amount = safeNumber(advance.amount, 0);
                if (amount > 0) {
                    object.accounts.push({
                        title: `Аванс: ${advance.title || "Аванс"}`,
                        amount: amount,
                        calculated: false
                    });
                }
            });
        }
        
        // 2. КОМИССИИ ПРОДАВЦОВ (только если оплата НЕ "seller")
        if (object.sellers && Array.isArray(object.sellers)) {
            object.sellers.forEach(seller => {
                const commission = safeNumber(seller.agent?.commission, 0);
                const agentName = seller.agent?.name || "продавца";
                const paymentMode = seller.agent?.paymentMode || "seller";
                
                if (commission > 0 && paymentMode !== "seller") {
                    let modeText = "";
                    if (paymentMode === "bank") modeText = " (банк)";
                    else modeText = " (покупатель)";
                    
                    object.accounts.push({
                        title: `Комиссия агента ${agentName}${modeText}`,
                        amount: commission,
                        calculated: true
                    });
                }
            });
        }
        
        // 3. ТРАНЗИТ
        if (transit > 0) {
            object.accounts.push({
                title: "Транзитные средства",
                amount: transit,
                calculated: true
            });
        }
        
        // 4. СОБСТВЕННЫЕ СРЕДСТВА
        let ownFundsInBank = 0;
        if (ownFundsFromBuyer > 0) {
            if (transit === 0) {
                ownFundsInBank = Math.max(0, ownFundsFromBuyer - totalAdvances);
            }
        }
        
        if (ownFundsInBank > 0) {
            object.accounts.push({
                title: "Собственные средства",
                amount: ownFundsInBank,
                calculated: false
            });
        }
        
        // 5. ДОПЛАТА СВОИМИ СРЕДСТВАМИ
        if (additionalOwnFunds > 0) {
            object.accounts.push({
                title: "Доплата своими средствами",
                amount: additionalOwnFunds,
                calculated: false
            });
        }
        
        // 6. КОМИССИЯ АГЕНТА ПОКУПАТЕЛЯ
        if (buyerAgentCommission > 0) {
            object.accounts.push({
                title: "Комиссия агента покупателя",
                amount: buyerAgentCommission,
                calculated: false
            });
        }
        
        // 7. ИПОТЕКА
        const alreadyHave = totalAdvances + transit + ownFundsInBank + additionalOwnFunds;
        const needTotal = price + buyerAgentCommission;
        
        let neededMortgage = 0;
        if (alreadyHave < needTotal) {
            neededMortgage = needTotal - alreadyHave;
        }
        
        if (neededMortgage > 0) {
            object.accounts.push({
                title: "Ипотека (расчет)",
                amount: neededMortgage,
                calculated: true
            });
        }
    }

    function getAdvances(object) {
        if (!object || !object.advances || !Array.isArray(object.advances)) {
            return 0;
        }
        return object.advances.reduce((sum, item) => {
            return sum + safeNumber(item?.amount, 0);
        }, 0);
    }

    function calculateSummary(deal) {
        if (!deal || !deal.objects) {
            deal.summary = { budget: 0, mortgage: 0, realMoney: 0 };
            return;
        }

        let budget = 0;
        let mortgage = 0;
        let realMoney = 0;

        deal.objects.forEach(object => {
            if (!object) return;
            budget += safeNumber(object.price, 0);

            if (object.buyers && Array.isArray(object.buyers)) {
                object.buyers.forEach(buyer => {
                    if (buyer) {
                        mortgage += safeNumber(buyer.mortgageFunds, 0);
                        realMoney += safeNumber(buyer.ownFunds, 0);
                    }
                });
            }
            realMoney += FlowEngine.incomingAmount(object);
        });

        realMoney += mortgage;

        deal.summary = { budget, mortgage, realMoney };
    }

    function safeNumber(value, defaultValue = 0) {
        const num = Number(value);
        return isNaN(num) ? defaultValue : Math.max(0, num);
    }

    return { rebuild };
})();