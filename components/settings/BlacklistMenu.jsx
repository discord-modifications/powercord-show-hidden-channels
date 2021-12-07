const { React } = require('powercord/webpack');
const { getModule, getModuleByDisplayName } = require('powercord/webpack');
const { AdvancedScrollerThin } = getModule(['AdvancedScrollerThin'], false);
const { DEFAULT_AVATARS } = getModule(['getUserAvatarURL'], false);
const PopoutList = getModuleByDisplayName('PopoutList', false);
const { getGuilds } = getModule(['getGuilds'], false);
const Flex = getModuleByDisplayName('Flex', false);

const PopoutListSearchBar = PopoutList.prototype.constructor.SearchBar;
const PopoutListDivider = PopoutList.prototype.constructor.Divider;
const SelectableItem = PopoutList.prototype.constructor.Item;
const FlexChild = Flex.prototype.constructor.Child;

const classes = {
   auditLogsFilter: getModule(['guildSettingsAuditLogsUserFilterPopout'], false).guildSettingsAuditLogsUserFilterPopout,
   discriminator: getModule(['discriminator', 'avatar', 'scroller'], false).discriminator,
   elevationBorderHigh: getModule(['elevationBorderHigh'], false).elevationBorderHigh,
   userText: getModule(['discriminator', 'avatar', 'scroller'], false).userText,
   scroller: getModule(['listWrapper', 'scroller', false]).scroller,
   alignCenter: getModule(['alignCenter'], false).alignCenter,
   popoutList: getModule(['popoutList'], false).popoutList
};

module.exports = class Settings extends React.Component {
   constructor(props) {
      super(props);

      const get = props.getSetting;

      this.state = {
         guildsQuery: '',
         blacklistedGuilds: get('blacklistedGuilds', [])
      };
   }

   render() {
      if (!AdvancedScrollerThin) return null;

      const guilds = getGuilds();

      return (
         <div>
            <div
               className={`shc-guild-settings ${classes.popoutList} ${classes.auditLogsFilter} ${classes.elevationBorderHigh}`}
               popoutKey='shc-guilds'
            >
               <PopoutListSearchBar
                  autoFocus={true}
                  placeholder='Search guilds'
                  query={this.state.guildsQuery || ''}
                  onChange={(e) => this.setState({ guildsQuery: e })}
                  onClear={() => this.setState({ guildsQuery: '' })}
               />
               <PopoutListDivider />
               <AdvancedScrollerThin className={`${classes.scroller} shc-guild-scroller`}>
                  {Object.values(guilds)
                     .sort()
                     .filter(guild => this.state.guildsQuery ? guild.name.toLowerCase().includes(this.state.guildsQuery.toLowerCase()) : true)
                     .map((guild, i) =>
                        <SelectableItem className='shc-guild-item' id={guild.id} key={i.toString()} selected={this.state.blacklistedGuilds.includes(guild.id)} onClick={(e) => {
                           if (!e.selected) {
                              this.state.blacklistedGuilds.push(e.id);
                              this._set('blacklistedGuilds', this.state.blacklistedGuilds);
                           } else {
                              this._set('blacklistedGuilds', this.state.blacklistedGuilds.filter(a => a !== e.id));
                           }
                           this.props.update();
                        }}>
                           <Flex align={classes.alignCenter} basis='auto' grow={1} shrink={1}>
                              <div>
                                 <Flex align={classes.alignCenter} basis='auto' grow={1} shrink={1}>
                                    <FlexChild key='avatar' basis='auto' grow={0} shrink={0} wrap={false}>
                                       <img
                                          src={guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : DEFAULT_AVATARS[0]}
                                          width={32}
                                          height={32}
                                          style={{ borderRadius: '360px' }}
                                       />
                                    </FlexChild>
                                    <FlexChild key='guild-text' basis='auto' grow={1} shrink={1} wrap={false}>
                                       <div className={classes.userText}>
                                          <span className={classes.userText}>{guild.name}</span>
                                       </div>
                                    </FlexChild>
                                 </Flex>
                              </div>
                           </Flex>
                        </SelectableItem>
                     )
                  }
               </AdvancedScrollerThin>
            </div>
         </div>
      );
   }

   _set(key, value = !this.state[key], defaultValue) {
      if (!value && defaultValue) {
         value = defaultValue;
      }

      this.props.updateSetting(key, value);
      this.setState({ [key]: value });
   }
};
