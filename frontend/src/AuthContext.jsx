  const logout = async () => {
    // Check if user is from branch login
    const branchSession = JSON.parse(localStorage.getItem('branch_session') || 'null')
    const isBranchUser = branchSession?.branch?.url_slug
    
    // Clear all storage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('branch_token')
    localStorage.removeItem('branch_session')
    setCurrentUser(null)
    
    // Redirect based on user type
    if (isBranchUser) {
      window.location.hash = `/branch-login/${branchSession.branch.url_slug}`
    } else {
      window.location.hash = '/login'
    }
  }
