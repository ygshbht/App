import _ from 'underscore';
import React from 'react';
import PropTypes from 'prop-types';
import HeaderWithBackButton from '../../../components/HeaderWithBackButton';
import ScreenWrapper from '../../../components/ScreenWrapper';
import withLocalize, {withLocalizePropTypes} from '../../../components/withLocalize';
import themeColors from '../../../styles/themes/default';
import * as Expensicons from '../../../components/Icon/Expensicons';
import * as App from '../../../libs/actions/App';
import Navigation from '../../../libs/Navigation/Navigation';
import ROUTES from '../../../ROUTES';
import SelectionListRadio from '../../../components/SelectionListRadio';

const greenCheckmark = {src: Expensicons.Checkmark, color: themeColors.success};

const propTypes = {
    ...withLocalizePropTypes,

    /** The preferred language of the App */
    preferredLocale: PropTypes.string.isRequired,
};

function LanguagePage(props) {
    const localesToLanguages = _.map(props.translate('languagePage.languages'), (language, key) => ({
        value: key,
        text: language.label,
        keyForList: key,

        // Include the green checkmark icon to indicate the currently selected value
        customIcon: props.preferredLocale === key ? greenCheckmark : undefined,

        // This property will make the currently selected value have bold text
        boldStyle: props.preferredLocale === key,
    }));

    return (
        <ScreenWrapper includeSafeAreaPaddingBottom={false}>
            <HeaderWithBackButton
                title={props.translate('languagePage.language')}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_PREFERENCES)}
            />

            <SelectionListRadio
                sections={[{data: localesToLanguages}]}
                onSelectRow={(language) => App.setLocaleAndNavigate(language.value)}
                initiallyFocusedOptionKey={_.find(localesToLanguages, (locale) => Boolean(locale.customIcon)).keyForList}
            />
        </ScreenWrapper>
    );
}

LanguagePage.displayName = 'LanguagePage';
LanguagePage.propTypes = propTypes;

export default withLocalize(LanguagePage);
