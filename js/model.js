/*
====================================================
MODEL V4 - ДОБАВЛЕНА ДОПЛАТА СВОИМИ СРЕДСТВАМИ
====================================================
*/

const DealModel = (() => {

    let objectCounter = 1;
    let personCounter = 1;

    function uid() {
        if (window.crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now() + "-" + Math.random();
    }

    function createDeal() {
        return {
            id: uid(),
            objects: [],
            summary: {}
        };
    }

    function createObject() {
        return {
            id: objectCounter++,
            address: "",
            type: "Квартира",
            rooms: "",
            area: "",
            price: 0,
            buyers: [],
            sellers: [],
            advances: [],
            accounts: [],
            incomingTransitions: [],
            totalRequired: 0,
            totalCollected: 0
        };
    }

    function createBuyer() {
        return {
            id: personCounter++,
            name: "",
            ownFunds: 0,
            additionalOwnFunds: 0, // НОВОЕ ПОЛЕ: доплата своими средствами
            mortgageFunds: 0,
            mortgageMode: false,
            agent: {
                name: "",
                commission: 0
            }
        };
    }

    function createSeller() {
        return {
            id: personCounter++,
            name: "",
            share: 100,
            agent: {
                name: "",
                commission: 0,
                paymentMode: "seller"
            },
            transitions: [],
            grossAmount: 0,
            netAmount: 0,
            calculatedTransit: 0,
            calculatedRemainder: 0
        };
    }

    function createTransition() {
        return {
            id: uid(),
            type: "object",
            toObjectId: null,
            amount: 0
        };
    }

    function createAdvance() {
        return {
            id: uid(),
            title: "Аванс",
            amount: 0
        };
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    return {
        createDeal,
        createObject,
        createBuyer,
        createSeller,
        createTransition,
        createAdvance,
        clone
    };

})();