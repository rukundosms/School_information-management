<?php
function is_logged_in() {
    return isset($_SESSION['role_id']);
}

function check_user_role($required_role) {
    if (!is_logged_in()) {
        return false;
    }
    
    // In a real application, you would check the user's role from the database
    // This is a simplified version
    $allowed_roles = ['Admin']; // Add other roles as needed
    
    // Assuming role is stored in session
    return in_array($_SESSION['role_id'], $allowed_roles) && $_SESSION['role_id'] === $required_role;
}
?>