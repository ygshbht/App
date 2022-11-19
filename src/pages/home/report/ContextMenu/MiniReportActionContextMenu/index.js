import _ from 'underscore';
import React from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';
import {
    propTypes as basePropTypes,
    defaultProps as baseDefaultProps,
} from '../baseReportActionContextMenuPropTypes';
import * as StyleUtils from '../../../../../styles/StyleUtils';
import BaseReportActionContextMenu from '../BaseReportActionContextMenu';

const propTypes = {
    ..._.omit(basePropTypes, ['isMini']),

    /** Should the reportAction this menu is attached to have the appearance of being
     * grouped with the previous reportAction? */
    displayAsGroup: PropTypes.bool,
};

const defaultProps = {
    ..._.omit(baseDefaultProps, ['isMini']),
    displayAsGroup: false,
};

const MiniReportActionContextMenu = props => (
    <View style={StyleUtils.getMiniReportActionContextMenuWrapperStyle(props.displayAsGroup)}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <BaseReportActionContextMenu isMini {...props} />
    </View>
);

MiniReportActionContextMenu.propTypes = propTypes;
MiniReportActionContextMenu.defaultProps = defaultProps;
MiniReportActionContextMenu.displayName = 'MiniReportActionContextMenu';

export default MiniReportActionContextMenu;
