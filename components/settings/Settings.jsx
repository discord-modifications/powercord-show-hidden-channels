const { React } = require('powercord/webpack');
const { SwitchItem, Category } = require('powercord/components/settings');
const BlacklistMenu = require('./BlacklistMenu');

module.exports = class Settings extends React.Component {
   constructor(props) {
      super(props);

      this.state = {
         channelsCategory: false,
         blacklistCategory: false
      };
   }

   render() {
      const { getSetting, toggleSetting, updateSetting } = this.props;

      const defaults = {
         GUILD_TEXT: true,
         GUILD_VOICE: true,
         GUILD_ANNOUNCEMENT: true,
         GUILD_STORE: true,
         GUILD_STAGE_VOICE: true
      };

      const settings = getSetting('channels', defaults);

      return (
         <div>
            <SwitchItem
               note={'Sort hidden channels in the native order instead of an extra category'}
               value={getSetting('sortNative', true)}
               onChange={() => {
                  toggleSetting('sortNative');
                  this.props.update();
               }}
            >
               Native Order
            </SwitchItem>
            <SwitchItem
               note={'Collapse hidden category after switching servers (requires native order to be off)'}
               value={getSetting('alwaysCollapse', false)}
               disabled={getSetting('sortNative', true)}
               onChange={() => {
                  toggleSetting('alwaysCollapse');
                  this.props.update();
               }}
            >
               Collapse Hidden Category
            </SwitchItem>
            <Category
               name={'Channels'}
               description={'Toggle the type of channels that will render'}
               opened={this.state.channelsCategory}
               onChange={() => this.setState({ channelsCategory: !this.state.channelsCategory })}
            >
               {
                  Object.keys(defaults).map(type => {
                     return (
                        <SwitchItem
                           value={getSetting('channels', defaults)[type]}
                           onChange={() => {
                              settings[type] = !settings[type];
                              updateSetting('channels', settings);
                              this.props.update();
                           }}
                        >
                           {`${this.capitalizeFirst(type.split('_')[1].toLowerCase())} Channel`}
                        </SwitchItem>
                     );
                  })
               }
            </Category>
            <Category
               name={'Blacklist'}
               description={'Blacklist guilds from showing hidden channels'}
               opened={this.state.blacklistCategory}
               onChange={() => this.setState({ blacklistCategory: !this.state.blacklistCategory })}
            >
               <BlacklistMenu {...this.props} />
            </Category>
         </div>
      );
   }

   capitalizeFirst(string) {
      return `${string.charAt(0).toUpperCase()}${string.substring(1)}`;
   }
};
