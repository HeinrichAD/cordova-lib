/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

var path = require('path');
var PluginInfoProvider = require('cordova-common').PluginInfoProvider;
var shell = require('shelljs');
var events = require('cordova-common').events;
var CordovaError = require('cordova-common').CordovaError;

module.exports.saveToConfigXmlOn = saveToConfigXmlOn;
module.exports.getInstalledPlugins = getInstalledPlugins;
module.exports.mergeVariables = mergeVariables;

function getInstalledPlugins (projectRoot) {
    var pluginsDir = path.join(projectRoot, 'plugins');
    // TODO: This should list based off of platform.json, not directories within plugins/
    var pluginInfoProvider = new PluginInfoProvider();
    return pluginInfoProvider.getAllWithinSearchPath(pluginsDir);
}

function saveToConfigXmlOn (config_json, options) {
    options = options || {};
    var autosave = config_json.auto_save_plugins || false;
    return autosave || options.save;
}

/*
 * Merges cli and config.xml variables.
 *
 * @param   {object}    pluginInfo
 * @param   {object}    config.xml
 * @param   {object}    options
 *
 * @return  {object}    object containing the new merged variables
 */

function mergeVariables (pluginInfo, cfg, opts) {
    // Validate top-level required variables
    var pluginVariables = pluginInfo.getPreferences();
    opts.cli_variables = opts.cli_variables || {};
    var pluginEntry = cfg.getPlugin(pluginInfo.id);
    // Get variables from config.xml
    var configVariables = pluginEntry ? pluginEntry.variables : {};
    // Add config variable if it's missing in cli_variables
    Object.keys(configVariables).forEach(function (variable) {
        opts.cli_variables[variable] = opts.cli_variables[variable] || configVariables[variable];
    });
    var missingVariables = Object.keys(pluginVariables)
        .filter(function (variableName) {
            // discard variables with default value
            return !(pluginVariables[variableName] || opts.cli_variables[variableName]);
        });

    if (missingVariables.length) {
        events.emit('verbose', 'Removing ' + pluginInfo.dir + ' because mandatory plugin variables were missing.');
        shell.rm('-rf', pluginInfo.dir);
        var msg = 'Variable(s) missing (use: --variable ' + missingVariables.join('=value --variable ') + '=value).';
        throw new CordovaError(msg);
    }
    return opts.cli_variables;
}
