<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);

// Get student info
$student_query = mysqli_query($conn, "
    SELECT s.*, c.class_name 
    FROM student s
    LEFT JOIN class c ON s.class = c.class_name
    WHERE s.sid = '$sid'
");
$student = mysqli_fetch_assoc($student_query);

// Mark notification as read
if (isset($_GET['mark_read'])) {
    $notif_id = intval($_GET['mark_read']);
    mysqli_query($conn, "UPDATE notifications SET is_read = 1 WHERE notification_id = '$notif_id' AND sid = '$sid'");
    header("location:student_notifications.php");
    exit();
}

// Mark all as read
if (isset($_GET['mark_all_read'])) {
    mysqli_query($conn, "UPDATE notifications SET is_read = 1 WHERE sid = '$sid'");
    header("location:student_notifications.php");
    exit();
}

// Delete notification
if (isset($_GET['delete'])) {
    $notif_id = intval($_GET['delete']);
    mysqli_query($conn, "DELETE FROM notifications WHERE notification_id = '$notif_id' AND sid = '$sid'");
    header("location:student_notifications.php");
    exit();
}

// Delete all read notifications
if (isset($_GET['delete_all_read'])) {
    mysqli_query($conn, "DELETE FROM notifications WHERE sid = '$sid' AND is_read = 1");
    header("location:student_notifications.php");
    exit();
}

// Get all notifications
$notifications_query = mysqli_query($conn, "
    SELECT * FROM notifications 
    WHERE sid = '$sid' 
    ORDER BY created_at DESC
");

$total_notifications = mysqli_num_rows($notifications_query);
$unread_count = mysqli_num_rows(mysqli_query($conn, "SELECT * FROM notifications WHERE sid = '$sid' AND is_read = 0"));
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Notifications - Student Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container-custom {
            max-width: 1000px;
            margin: 0 auto;
        }
        
        /* Header Styles */
        .header-card {
            background: white;
            border-radius: 12px;
            padding: 25px 30px;
            margin-bottom: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .welcome-section h1 {
            font-size: 28px;
            color: #202124;
            margin-bottom: 5px;
        }
        
        .welcome-section p {
            color: #5f6368;
            margin-bottom: 0;
        }
        
        /* Stats Cards */
        .stats-container {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            flex: 1;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-3px);
        }
        
        .stat-card i {
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #1a73e8;
        }
        
        .stat-label {
            color: #5f6368;
            font-size: 14px;
        }
        
        .stat-card.unread i { color: #d93025; }
        .stat-card.unread .stat-number { color: #d93025; }
        .stat-card.total i { color: #1a73e8; }
        .stat-card.total .stat-number { color: #1a73e8; }
        
        /* Action Buttons */
        .action-buttons {
            background: white;
            border-radius: 12px;
            padding: 15px 20px;
            margin-bottom: 25px;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .btn-action {
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-mark-all {
            background: #1a73e8;
            color: white;
        }
        
        .btn-mark-all:hover {
            background: #1557b0;
        }
        
        .btn-delete-read {
            background: #fce8e6;
            color: #d93025;
        }
        
        .btn-delete-read:hover {
            background: #f8d7da;
        }
        
        /* Notification List */
        .notifications-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .notification-item {
            display: flex;
            align-items: flex-start;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            transition: background 0.2s;
            cursor: pointer;
        }
        
        .notification-item:hover {
            background: #f8f9fa;
        }
        
        .notification-item.unread {
            background: #e8f0fe;
        }
        
        .notification-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            flex-shrink: 0;
        }
        
        .notification-icon i {
            font-size: 24px;
        }
        
        .notification-icon.assessment {
            background: #e8f0fe;
            color: #1a73e8;
        }
        
        .notification-icon.grade {
            background: #e6f4ea;
            color: #34a853;
        }
        
        .notification-icon.approval {
            background: #fef7e0;
            color: #f9ab00;
        }
        
        .notification-icon.system {
            background: #fce8e6;
            color: #d93025;
        }
        
        .notification-content {
            flex: 1;
        }
        
        .notification-title {
            font-size: 16px;
            font-weight: 600;
            color: #202124;
            margin-bottom: 5px;
        }
        
        .notification-message {
            font-size: 14px;
            color: #5f6368;
            margin-bottom: 8px;
            line-height: 1.5;
        }
        
        .notification-meta {
            display: flex;
            gap: 15px;
            font-size: 12px;
            color: #9aa0a6;
        }
        
        .notification-meta i {
            margin-right: 4px;
            font-size: 12px;
        }
        
        .unread-badge {
            background: #d93025;
            color: white;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            margin-left: 10px;
        }
        
        .notification-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
            margin-left: 15px;
        }
        
        .btn-notif-action {
            background: none;
            border: none;
            color: #9aa0a6;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .btn-notif-action:hover {
            background: #f0f0f0;
            color: #1a73e8;
        }
        
        .btn-notif-action.delete:hover {
            color: #d93025;
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
        }
        
        .empty-state i {
            font-size: 64px;
            color: #dadce0;
            margin-bottom: 20px;
        }
        
        .empty-state h4 {
            color: #202124;
            margin-bottom: 10px;
        }
        
        .empty-state p {
            color: #5f6368;
        }
        
        /* Toast Message */
        .toast-message {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #323232;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .stats-container {
                flex-direction: column;
                gap: 10px;
            }
            
            .notification-item {
                flex-direction: column;
            }
            
            .notification-actions {
                margin-left: 0;
                margin-top: 10px;
                justify-content: flex-end;
            }
            
            .action-buttons {
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container-custom">
        <!-- Header -->
        <div class="header-card">
            <div class="d-flex justify-content-between align-items-center">
                <div class="welcome-section">
                    <h1>
                        <i class="fas fa-bell" style="color: #1a73e8;"></i> 
                        My Notifications
                    </h1>
                    <p>Stay updated with your assessment results and announcements</p>
                </div>
                <div>
                    <a href="student_dashboard.php" class="btn btn-outline-secondary">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </a>
                </div>
            </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="stats-container">
            <div class="stat-card total">
                <i class="fas fa-bell"></i>
                <div class="stat-number"><?php echo $total_notifications; ?></div>
                <div class="stat-label">Total Notifications</div>
            </div>
            <div class="stat-card unread">
                <i class="fas fa-circle"></i>
                <div class="stat-number"><?php echo $unread_count; ?></div>
                <div class="stat-label">Unread</div>
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
            <?php if($unread_count > 0): ?>
                <a href="?mark_all_read=1" class="btn-action btn-mark-all" onclick="return confirm('Mark all notifications as read?')">
                    <i class="fas fa-check-double"></i> Mark All as Read
                </a>
            <?php endif; ?>
            
            <?php if($total_notifications > 0): ?>
                <a href="?delete_all_read=1" class="btn-action btn-delete-read" onclick="return confirm('Delete all read notifications?')">
                    <i class="fas fa-trash-alt"></i> Delete Read Notifications
                </a>
            <?php endif; ?>
        </div>
        
        <!-- Notifications List -->
        <div class="notifications-container">
            <?php if($total_notifications > 0): ?>
                <?php while($notif = mysqli_fetch_assoc($notifications_query)): 
                    $icon_class = 'system';
                    $icon_icon = 'fa-bell';
                    
                    if(strpos($notif['title'], 'Assessment') !== false || strpos($notif['title'], 'Submitted') !== false) {
                        $icon_class = 'assessment';
                        $icon_icon = 'fa-file-alt';
                    } elseif(strpos($notif['title'], 'Graded') !== false) {
                        $icon_class = 'grade';
                        $icon_icon = 'fa-star';
                    } elseif(strpos($notif['title'], 'Approved') !== false) {
                        $icon_class = 'approval';
                        $icon_icon = 'fa-check-circle';
                    } else {
                        $icon_class = 'system';
                        $icon_icon = 'fa-bell';
                    }
                    
                    $time_ago = '';
                    $timestamp = strtotime($notif['created_at']);
                    $now = time();
                    $diff = $now - $timestamp;
                    
                    if($diff < 60) {
                        $time_ago = 'Just now';
                    } elseif($diff < 3600) {
                        $minutes = floor($diff / 60);
                        $time_ago = $minutes . ' minute' . ($minutes > 1 ? 's' : '') . ' ago';
                    } elseif($diff < 86400) {
                        $hours = floor($diff / 3600);
                        $time_ago = $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
                    } else {
                        $days = floor($diff / 86400);
                        $time_ago = $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
                    }
                ?>
                    <div class="notification-item <?php echo $notif['is_read'] ? '' : 'unread'; ?>" 
                         onclick="window.location.href='<?php echo $notif['link'] ?: 'javascript:void(0)'; ?>'">
                        <div class="notification-icon <?php echo $icon_class; ?>">
                            <i class="fas <?php echo $icon_icon; ?>"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">
                                <?php echo htmlspecialchars($notif['title']); ?>
                                <?php if(!$notif['is_read']): ?>
                                    <span class="unread-badge">NEW</span>
                                <?php endif; ?>
                            </div>
                            <div class="notification-message">
                                <?php echo nl2br(htmlspecialchars($notif['message'])); ?>
                            </div>
                            <div class="notification-meta">
                                <span><i class="far fa-clock"></i> <?php echo $time_ago; ?></span>
                                <span><i class="far fa-calendar-alt"></i> <?php echo date('M d, Y h:i A', strtotime($notif['created_at'])); ?></span>
                            </div>
                        </div>
                        <div class="notification-actions">
                            <?php if(!$notif['is_read']): ?>
                                <a href="?mark_read=<?php echo $notif['notification_id']; ?>" 
                                   class="btn-notif-action" 
                                   onclick="event.stopPropagation()"
                                   title="Mark as read">
                                    <i class="fas fa-check-circle"></i>
                                </a>
                            <?php endif; ?>
                            <a href="?delete=<?php echo $notif['notification_id']; ?>" 
                               class="btn-notif-action delete" 
                               onclick="event.stopPropagation(); return confirm('Delete this notification?')"
                               title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </a>
                        </div>
                    </div>
                <?php endwhile; ?>
            <?php else: ?>
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h4>No Notifications</h4>
                    <p>You don't have any notifications yet.</p>
                    <p>When you receive assessment results or announcements, they will appear here.</p>
                    <a href="student_dashboard.php" class="btn btn-primary mt-3">
                        <i class="fas fa-home"></i> Go to Dashboard
                    </a>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <script>
        // Auto-refresh notifications every 30 seconds
        setTimeout(function() {
            location.reload();
        }, 30000);
        
        // Show toast message if redirected with parameter
        <?php if(isset($_GET['marked'])): ?>
            showToast('Notification marked as read');
        <?php elseif(isset($_GET['deleted'])): ?>
            showToast('Notification deleted');
        <?php endif; ?>
        
        function showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'toast-message';
            toast.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    </script>
</body>
</html>