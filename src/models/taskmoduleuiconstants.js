// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { UISettings } = require('./uisettings');
const { TaskModuleIds } = require('./taskmoduleids');

const TaskModuleUIConstants = {

    CustomForm: new UISettings(510, 450, 'Custom Form', TaskModuleIds.CustomForm, 'Custom Form'),
    AdaptiveCard: new UISettings(400, 200, 'Adaptive Card: Inputs', TaskModuleIds.AdaptiveCard, 'Adaptive Card'),
    Find: new UISettings(500, 300, 'Find', TaskModuleIds.Find, 'Find'),
    Apstatus: new UISettings(500, 300, 'Ap Status', TaskModuleIds.Apstatus, 'Ap Status'),
    ApstatusDeviceList: new UISettings(600, 600, 'Ap Status Device List', TaskModuleIds.ApstatusDeviceList, 'Ap Status Device List'),
    Help: new UISettings(700, 600, 'Help', TaskModuleIds.Help, 'Help'),
    Location: new UISettings(1000, 700, 'Location', TaskModuleIds.Location, 'Location'),
    Extras: new UISettings(400, 200, 'Extras', TaskModuleIds.Extras, 'Extras'),
    DisplayOption: new UISettings(550, 300, 'Display assistance', TaskModuleIds.DisplayOption, 'DisplayOption'),
    UserInfo: new UISettings(780, 700, 'User Information', TaskModuleIds.UserInfo, 'UserInfo')
};

module.exports.TaskModuleUIConstants = TaskModuleUIConstants;
