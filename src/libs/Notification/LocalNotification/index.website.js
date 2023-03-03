import BrowserNotifications from './BrowserNotifications';

function showCommentNotification({reportAction, onClick}) {
    Log.info('[LOCAL_NOTIFICATION] Creating report comment notification');
    BrowserNotifications.pushReportCommentNotification({reportAction, onClick}, true);
}

function showUpdateAvailableNotification() {
    Log.info('[LOCAL_NOTIFICATION] Creating update available notification');
    BrowserNotifications.pushUpdateAvailableNotification();
}

export default {
    showCommentNotification,
    showUpdateAvailableNotification,
};
