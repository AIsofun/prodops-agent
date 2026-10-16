// Generated from contracts/openapi.json. Do not edit.
"use strict";
exports.validateHealth = validate21;
const schema32 = {"additionalProperties":false,"properties":{"mode":{"$ref":"#/$defs/DeploymentMode"},"scope":{"default":"service_skeleton","enum":["service_skeleton","development"],"title":"Scope","type":"string"},"status":{"enum":["alive","ready","not_ready"],"title":"Status","type":"string"}},"required":["status","mode"],"title":"HealthResponse","type":"object"};
const schema33 = {"enum":["local","server"],"title":"DeploymentMode","type":"string"};

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate21.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.status === undefined) && (missing0 = "status")) || ((data.mode === undefined) && (missing0 = "mode"))){
validate21.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((key0 === "mode") || (key0 === "scope")) || (key0 === "status"))){
validate21.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.mode !== undefined){
let data0 = data.mode;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate21.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/$defs/DeploymentMode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data0 === "local") || (data0 === "server"))){
validate21.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/$defs/DeploymentMode/enum",keyword:"enum",params:{allowedValues: schema33.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scope !== undefined){
let data1 = data.scope;
const _errs5 = errors;
if(typeof data1 !== "string"){
validate21.errors = [{instancePath:instancePath+"/scope",schemaPath:"#/properties/scope/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data1 === "service_skeleton") || (data1 === "development"))){
validate21.errors = [{instancePath:instancePath+"/scope",schemaPath:"#/properties/scope/enum",keyword:"enum",params:{allowedValues: schema32.properties.scope.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs5 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data2 = data.status;
const _errs7 = errors;
if(typeof data2 !== "string"){
validate21.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data2 === "alive") || (data2 === "ready")) || (data2 === "not_ready"))){
validate21.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema32.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
else {
validate21.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

exports.validateCapabilities = validate22;
const schema34 = {"additionalProperties":false,"properties":{"authentication":{"default":"unavailable","enum":["unavailable","development_token"],"title":"Authentication","type":"string"},"conversations":{"default":false,"title":"Conversations","type":"boolean"},"deployment_id":{"description":"Durable identity when storage is configured; otherwise ephemeral instance ID.","format":"uuid","title":"Deployment Id","type":"string"},"event_schema_version":{"const":"1.0","title":"Event Schema Version","type":"string"},"event_stream":{"const":false,"default":false,"title":"Event Stream","type":"boolean"},"execution_enabled":{"const":false,"default":false,"title":"Execution Enabled","type":"boolean"},"mode":{"$ref":"#/$defs/DeploymentMode"},"protocol_version":{"const":"1.1","title":"Protocol Version","type":"string"},"runs":{"default":false,"title":"Runs","type":"boolean"},"scope":{"default":"service_skeleton","enum":["service_skeleton","development"],"title":"Scope","type":"string"}},"required":["protocol_version","event_schema_version","deployment_id","mode"],"title":"CapabilitiesResponse","type":"object"};
const func1 = Object.prototype.hasOwnProperty;
const formats0 = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function validate22(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate22.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.protocol_version === undefined) && (missing0 = "protocol_version")) || ((data.event_schema_version === undefined) && (missing0 = "event_schema_version"))) || ((data.deployment_id === undefined) && (missing0 = "deployment_id"))) || ((data.mode === undefined) && (missing0 = "mode"))){
validate22.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(func1.call(schema34.properties, key0))){
validate22.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.authentication !== undefined){
let data0 = data.authentication;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate22.errors = [{instancePath:instancePath+"/authentication",schemaPath:"#/properties/authentication/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data0 === "unavailable") || (data0 === "development_token"))){
validate22.errors = [{instancePath:instancePath+"/authentication",schemaPath:"#/properties/authentication/enum",keyword:"enum",params:{allowedValues: schema34.properties.authentication.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.conversations !== undefined){
const _errs4 = errors;
if(typeof data.conversations !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/conversations",schemaPath:"#/properties/conversations/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.deployment_id !== undefined){
let data2 = data.deployment_id;
const _errs6 = errors;
if(errors === _errs6){
if(errors === _errs6){
if(typeof data2 === "string"){
if(!(formats0.test(data2))){
validate22.errors = [{instancePath:instancePath+"/deployment_id",schemaPath:"#/properties/deployment_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate22.errors = [{instancePath:instancePath+"/deployment_id",schemaPath:"#/properties/deployment_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.event_schema_version !== undefined){
let data3 = data.event_schema_version;
const _errs8 = errors;
if(typeof data3 !== "string"){
validate22.errors = [{instancePath:instancePath+"/event_schema_version",schemaPath:"#/properties/event_schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.0" !== data3){
validate22.errors = [{instancePath:instancePath+"/event_schema_version",schemaPath:"#/properties/event_schema_version/const",keyword:"const",params:{allowedValue: "1.0"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.event_stream !== undefined){
let data4 = data.event_stream;
const _errs10 = errors;
if(typeof data4 !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/event_stream",schemaPath:"#/properties/event_stream/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
if(false !== data4){
validate22.errors = [{instancePath:instancePath+"/event_stream",schemaPath:"#/properties/event_stream/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.execution_enabled !== undefined){
let data5 = data.execution_enabled;
const _errs12 = errors;
if(typeof data5 !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/execution_enabled",schemaPath:"#/properties/execution_enabled/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
if(false !== data5){
validate22.errors = [{instancePath:instancePath+"/execution_enabled",schemaPath:"#/properties/execution_enabled/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.mode !== undefined){
let data6 = data.mode;
const _errs14 = errors;
if(typeof data6 !== "string"){
validate22.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/$defs/DeploymentMode/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data6 === "local") || (data6 === "server"))){
validate22.errors = [{instancePath:instancePath+"/mode",schemaPath:"#/$defs/DeploymentMode/enum",keyword:"enum",params:{allowedValues: schema33.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.protocol_version !== undefined){
let data7 = data.protocol_version;
const _errs17 = errors;
if(typeof data7 !== "string"){
validate22.errors = [{instancePath:instancePath+"/protocol_version",schemaPath:"#/properties/protocol_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.1" !== data7){
validate22.errors = [{instancePath:instancePath+"/protocol_version",schemaPath:"#/properties/protocol_version/const",keyword:"const",params:{allowedValue: "1.1"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs17 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.runs !== undefined){
const _errs19 = errors;
if(typeof data.runs !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/runs",schemaPath:"#/properties/runs/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs19 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.scope !== undefined){
let data9 = data.scope;
const _errs21 = errors;
if(typeof data9 !== "string"){
validate22.errors = [{instancePath:instancePath+"/scope",schemaPath:"#/properties/scope/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data9 === "service_skeleton") || (data9 === "development"))){
validate22.errors = [{instancePath:instancePath+"/scope",schemaPath:"#/properties/scope/enum",keyword:"enum",params:{allowedValues: schema34.properties.scope.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs21 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
}
}
}
}
}
}
}
}
else {
validate22.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate22.errors = vErrors;
return errors === 0;
}
validate22.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
