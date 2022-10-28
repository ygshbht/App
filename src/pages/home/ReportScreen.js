import React from 'react';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import lodashGet from 'lodash/get';
import _ from 'underscore';
import {Freeze} from 'react-freeze';
import styles from '../../styles/styles';
import ScreenWrapper from '../../components/ScreenWrapper';
import HeaderView from './HeaderView';
import Navigation from '../../libs/Navigation/Navigation';
import ROUTES from '../../ROUTES';
import * as Report from '../../libs/actions/Report';
import ONYXKEYS from '../../ONYXKEYS';
import Permissions from '../../libs/Permissions';
import * as ReportUtils from '../../libs/ReportUtils';
import ReportActionsView from './report/ReportActionsView';
import CONST from '../../CONST';
import ReportActionsSkeletonView from '../../components/ReportActionsSkeletonView';
import reportActionPropTypes from './report/reportActionPropTypes';
import toggleReportActionComposeView from '../../libs/toggleReportActionComposeView';
import compose from '../../libs/compose';
import networkPropTypes from '../../components/networkPropTypes';

const propTypes = {
    /** Navigation route context info provided by react navigation */
    route: PropTypes.shape({
        /** Route specific parameters used on this screen */
        params: PropTypes.shape({
            /** The ID of the report this screen should display */
            reportID: PropTypes.string,
        }).isRequired,
    }).isRequired,

    /** Tells us if the sidebar has rendered */
    isSidebarLoaded: PropTypes.bool,

    /** The report currently being looked at */
    report: PropTypes.shape({
        /** Number of actions unread */
        unreadActionCount: PropTypes.number,

        /** The largest sequenceNumber on this report */
        maxSequenceNumber: PropTypes.number,

        /** Whether there is an outstanding amount in IOU */
        hasOutstandingIOU: PropTypes.bool,

        /** Flag to check if the report actions data are loading */
        isLoadingReportActions: PropTypes.bool,

        /** ID for the report */
        reportID: PropTypes.string,
    }),

    /** Array of report actions for this report */
    reportActions: PropTypes.objectOf(PropTypes.shape(reportActionPropTypes)),

    /** Are we waiting for more report data? */
    isLoadingReportData: PropTypes.bool,

    /** Whether the composer is full size */
    isComposerFullSize: PropTypes.bool,

    /** Beta features list */
    betas: PropTypes.arrayOf(PropTypes.string),

    /** The policies which the user has access to */
    policies: PropTypes.objectOf(PropTypes.shape({
        /** The policy name */
        name: PropTypes.string,

        /** The type of the policy */
        type: PropTypes.string,
    })),

    /** Information about the network */
    network: networkPropTypes.isRequired,
};

const defaultProps = {
    isSidebarLoaded: false,
    reportActions: {},
    report: {
        unreadActionCount: 0,
        maxSequenceNumber: 0,
        hasOutstandingIOU: false,
        isLoadingReportActions: false,
    },
    isLoadingReportData: false,
    isComposerFullSize: false,
    betas: [],
    policies: {},
};

/**
 * Get the currently viewed report ID as number
 *
 * @param {Object} route
 * @param {Object} route.params
 * @param {String} route.params.reportID
 * @returns {Number}
 */
function getReportID(route) {
    const params = route.params;
    return Number.parseInt(params.reportID, 10);
}

// Keep a reference to the list view height so we can use it when a new ReportScreen component mounts
let reportActionsListViewHeight = 0;

class ReportScreen extends React.Component {
    constructor(props) {
        super(props);

        this.onSubmitComment = this.onSubmitComment.bind(this);
        this.updateViewportOffsetTop = this.updateViewportOffsetTop.bind(this);
        this.chatWithAccountManager = this.chatWithAccountManager.bind(this);
        this.dismissBanner = this.dismissBanner.bind(this);
        this.removeViewportResizeListener = () => {};
        this.didLoadReports = false;

        this.state = {
            skeletonViewContainerHeight: reportActionsListViewHeight,
            viewportOffsetTop: 0,
            isBannerVisible: true,
        };
    }

    componentDidMount() {
        this.storeCurrentlyViewedReport();
        this.removeViewportResizeListener = addViewportResizeListener(this.updateViewportOffsetTop);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.isLoadingReportData && !this.props.isLoadingReportData) {
            this.didLoadReports = true;
        }

        if (this.props.route.params.reportID === prevProps.route.params.reportID) {
            return;
        }

        this.storeCurrentlyViewedReport();
    }

    componentWillUnmount() {
        this.removeViewportResizeListener();
    }

    /**
     * @param {String} text
     */
    onSubmitComment(text) {
        Report.addComment(getReportID(this.props.route), text);
    }

    /**
     * When reports change there's a brief time content is not ready to be displayed
     * It Should show the loader if it's the first time we are opening the report
     *
     * @returns {Boolean}
     */
    shouldShowLoader() {
        const reportIDFromPath = getReportID(this.props.route);

        // This means there are no reportActions at all to display, but it is still in the process of loading the next set of actions.
        const isLoadingInitialReportActions = _.isEmpty(this.props.reportActions) && this.props.report.isLoadingReportActions;

        // If we are loading reports for the first time when the app loads we will defer the ReportActionsView so it can initialize with
        // the correct unread status.
        const isLoadingInitialReportData = this.props.isLoadingReportData && !this.didLoadReports;

        // This is necessary so that when we are retrieving the next report data from Onyx the ReportActionsView will remount completely
        const isTransitioning = this.props.report && this.props.report.reportID !== reportIDFromPath;
        return !reportIDFromPath || isLoadingInitialReportActions || !this.props.report.reportID || isTransitioning || isLoadingInitialReportData;
    }

    fetchReportIfNeeded() {
        const reportIDFromPath = getReportID(this.props.route);
        if (_.isNaN(reportIDFromPath)) {
            Report.handleInaccessibleReport();
            return;
        }

        // Always reset the state of the composer view when the current reportID changes
        toggleReportActionComposeView(true);
        Report.updateCurrentlyViewedReportID(reportIDFromPath);

        // It possible that we may not have the report object yet in Onyx yet e.g. we navigated to a URL for an accessible report that
        // is not stored locally yet. If props.report.reportID exists, then the report has been stored locally and nothing more needs to be done.
        // If it doesn't exist, then we fetch the report from the API.
        if (this.props.report.reportID) {
            return;
        }

        Report.fetchChatReportsByIDs([reportIDFromPath], true);
    }

    /**
     * @param {SyntheticEvent} e
     */
    updateViewportOffsetTop(e) {
        const viewportOffsetTop = lodashGet(e, 'target.offsetTop', 0);
        this.setState({viewportOffsetTop});
    }

    dismissBanner() {
        this.setState({isBannerVisible: false});
    }

    chatWithAccountManager() {
        Navigation.navigate(ROUTES.getReportRoute(this.props.accountManagerReportID));
    }

    render() {
        if (!this.props.isSidebarLoaded || _.isEmpty(this.props.personalDetails)) {
            return null;
        }

        // We let Free Plan default rooms to be shown in the App - it's the one exception to the beta, otherwise do not show policy rooms in product
        if (!Permissions.canUseDefaultRooms(this.props.betas)
            && ReportUtils.isDefaultRoom(this.props.report)
            && ReportUtils.getPolicyType(this.props.report, this.props.policies) !== CONST.POLICY.TYPE.FREE) {
            return null;
        }

        if (!Permissions.canUsePolicyRooms(this.props.betas) && ReportUtils.isUserCreatedPolicyRoom(this.props.report)) {
            return null;
        }

        // We are either adding a workspace room, or we're creating a chat, it isn't possible for both of these to be pending, or to have errors for the same report at the same time, so
        // simply looking up the first truthy value for each case will get the relevant property if it's set.
        const reportID = getReportID(this.props.route);
        const addWorkspaceRoomPendingAction = lodashGet(this.props.report, 'pendingFields.addWorkspaceRoom');
        const addWorkspaceRoomErrors = lodashGet(this.props.report, 'errorFields.addWorkspaceRoom');
        const screenWrapperStyle = [styles.appContent, styles.flex1, {marginTop: this.state.viewportOffsetTop}];
        return (
            <ScreenWrapper
                style={[styles.appContent, styles.flex1, {marginTop: this.state.viewportOffsetTop}]}
            >
                <ScreenWrapper
                    style={screenWrapperStyle}
                >
                    <OfflineWithFeedback
                        pendingAction={pendingAction}
                        errors={errors}
                        errorRowStyles={styles.dNone}
                    >
                        <OfflineWithFeedback
                            pendingAction={addWorkspaceRoomOrChatPendingAction}
                            errors={addWorkspaceRoomOrChatErrors}
                            shouldShowErrorMessages={false}
                        >
                            <HeaderView
                                reportID={reportID}
                                onNavigationMenuButtonClicked={() => Navigation.navigate(ROUTES.HOME)}
                                personalDetails={this.props.personalDetails}
                                report={this.props.report}
                                session={this.props.session}
                                isComposerFullSize={this.props.isComposerFullSize}
                            />
                        )}
                    {(isArchivedRoom || this.props.session.shouldShowComposeInput) && (
                        <View style={[this.setChatFooterStyles(this.props.network.isOffline), this.props.isComposerFullSize && styles.chatFooterFullCompose]}>
                            {
                                isArchivedRoom
                                    ? (
                                        <ArchivedReportFooter
                                            reportClosedAction={reportClosedAction}
                                            report={this.props.report}
                                        />
                                        <ReportFooter
                                            errors={addWorkspaceRoomOrChatErrors}
                                            pendingAction={addWorkspaceRoomOrChatPendingAction}
                                            isOffline={this.props.network.isOffline}
                                            reportActions={this.props.reportActions}
                                            report={this.props.report}
                                            isComposerFullSize={this.props.isComposerFullSize}
                                            onSubmitComment={this.onSubmitComment}
                                        />
                                    </>
                                )}
                        </View>
                    </FullPageNotFoundView>
                </ScreenWrapper>
            </Freeze>
        );
    }
}

ReportScreen.propTypes = propTypes;
ReportScreen.defaultProps = defaultProps;

export default compose(
    withNetwork(),
    withOnyx({
        isSidebarLoaded: {
            key: ONYXKEYS.IS_SIDEBAR_LOADED,
        },
        session: {
            key: ONYXKEYS.SESSION,
        },
        reportActions: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getReportID(route)}`,
            canEvict: false,
        },
        report: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT}${getReportID(route)}`,
        },
        isComposerFullSize: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT_IS_COMPOSER_FULL_SIZE}${getReportID(route)}`,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
        policies: {
            key: ONYXKEYS.COLLECTION.POLICY,
        },
        accountManagerReportID: {
            key: ONYXKEYS.ACCOUNT_MANAGER_REPORT_ID,
        },
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS,
        },
        isLoadingReportData: {
            key: ONYXKEYS.IS_LOADING_REPORT_DATA,
        },
    }),
)(ReportScreen);
