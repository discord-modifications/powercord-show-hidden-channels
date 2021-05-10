const { React } = require('powercord/webpack');
const { SwitchItem } = require('powercord/components/settings');

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
                  toggleSetting('sortNative');
                  this.props.update();
               }}
            >
               Native Order
            </SwitchItem>
         </div>
      );
   }
};
