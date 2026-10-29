// backend/middleware/branchAccess.js

/**
 * Middleware to check branch access for branch users.
 */
function createBranchAccessMiddleware() {
    return (req, res, next) => {
        try {
            // अगर यूजर branch या branch_user है, तो चेक करें कि उसका branch_id है या नहीं
            if (req.user && (req.user.role === 'branch' || req.user.role === 'branch_user')) {
                if (!req.user.branch_id) {
                    return res.status(403).json({ 
                        error: 'Access denied: No branch assigned to this user.' 
                    });
                }
                // आगे के रूट्स के लिए branch_id को req ऑब्जेक्ट में अटैच कर दें
                req.branchId = req.user.branch_id;
            }
            next(); // सब ठीक है तो अगले स्टेप पर जाएं
        } catch (error) {
            return res.status(500).json({ error: 'Branch access check failed' });
        }
    };
}

module.exports = createBranchAccessMiddleware;
