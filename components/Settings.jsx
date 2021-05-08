const { React } = require('powercord/webpack');
const { SwitchItem } = require('powercord/components/settings');
const { forceUpdateElement } = require('powercord/util');

module.exports = class Settings extends React.Component {
   constructor(props) {
      super(props);
   }

   render() {
      const { getSetting, toggleSetting } = this.props;
      return (
         <div>
            <SwitchItem
               note={'Sort hidden Channels in the native Order instead of an extra Category'}
               value={getSetting('sortNative', true)}
               onChange={() => {
                  forceUpdateElement('div[id="channels"]');
                  toggleSetting('sortNative');
               }}
            >
               Native Order
            </SwitchItem>
         </div>
      );
   }
};
