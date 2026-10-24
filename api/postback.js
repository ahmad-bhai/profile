export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Firebase Realtime Database Base URL
    const DB_URL = "https://trader-id-d0734-default-rtdb.firebaseio.com/mohsin";

    try {
        // 1. DATA RECEIVE KARNA (Quotex Postback - GET Method)
        if (req.method === 'GET') {
            const { 
                uid, 
                trader_id, 
                status, 
                sumdep, 
                sumwithdraw, 
                country, 
                eid, 
                event_id, 
                cid, 
                click_id, 
                sid, 
                site_id, 
                lid, 
                reg, 
                conf, 
                ftd, 
                dep, 
                withdrawal 
            } = req.query;

            const finalUid = uid || trader_id;

            if (!finalUid) {
                return res.status(400).send("Error: Missing Trader ID (uid)");
            }

            // Existing user check from Firebase
            let existingData = {};
            try {
                const checkRes = await fetch(`${DB_URL}/${finalUid}.json`);
                if (checkRes.ok) {
                    existingData = (await checkRes.json()) || {};
                }
            } catch (err) {
                console.error("Fetch existing user error:", err);
            }

            // Parse deposit and withdrawal correctly
            const parsedDeposit = sumdep !== undefined && sumdep !== "" ? parseFloat(sumdep) : parseFloat(existingData.total_deposit || 0);
            const parsedWithdrawal = sumwithdraw !== undefined && sumwithdraw !== "" ? parseFloat(sumwithdraw) : parseFloat(existingData.total_withdrawal || 0);

            const userData = {
                uid: finalUid,
                status: status || existingData.status || 'registered',
                country: country || existingData.country || "Unknown",
                
                // Track Status Flags
                is_registered: reg === "true" || status === "reg" || existingData.is_registered || false,
                is_email_confirmed: conf === "true" || status === "conf" || existingData.is_email_confirmed || false,
                is_ftd: ftd === "true" || status === "ftd" || parsedDeposit > 0 || existingData.is_ftd || false,
                has_deposited: dep === "true" || status === "dep" || existingData.has_deposited || false,
                has_withdrawn: withdrawal === "true" || status === "withdrawal" || existingData.has_withdrawn || false,

                // Financial Tracking
                total_deposit: isNaN(parsedDeposit) ? 0 : parsedDeposit,
                total_withdrawal: isNaN(parsedWithdrawal) ? 0 : parsedWithdrawal,

                // Tracking IDs
                event_id: eid || event_id || existingData.event_id || "N/A",
                click_id: cid || click_id || existingData.click_id || "N/A",
                site_id: sid || site_id || existingData.site_id || "N/A",
                link_id: lid || existingData.link_id || "N/A",

                // Timestamps
                created_at: existingData.created_at || new Date().toISOString(),
                last_updated: new Date().toISOString()
            };

            // Save / Update in Firebase
            const saveResponse = await fetch(`${DB_URL}/${finalUid}.json`, {
                method: 'PUT',
                body: JSON.stringify(userData),
                headers: { 'Content-Type': 'application/json' }
            });

            if (saveResponse.ok) {
                return res.status(200).send("✅ Quotex Postback Processed");
            } else {
                return res.status(500).send("❌ Firebase Error");
            }
        }

        // 2. DATA VERIFY KARNA (Telegram Bot - POST Method)
        if (req.method === 'POST') {
            const { checkId } = req.body;

            if (!checkId) {
                return res.status(400).json({ success: false, message: "checkId parameter is required" });
            }

            const fetchResponse = await fetch(`${DB_URL}/${checkId}.json`);
            const data = await fetchResponse.json();

            if (data) {
                return res.status(200).json({ 
                    success: true, 
                    message: "Trader ID verified successfully",
                    trader: data 
                });
            } else {
                return res.status(404).json({ 
                    success: false, 
                    message: "Trader ID not found under affiliate link" 
                });
            }
        }

        return res.status(405).send("Method Not Allowed");

    } catch (error) {
        console.error("Quotex Postback Error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}
