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
const schema34 = {"additionalProperties":false,"properties":{"authentication":{"default":"unavailable","enum":["unavailable","development_token"],"title":"Authentication","type":"string"},"conversations":{"default":false,"title":"Conversations","type":"boolean"},"deployment_id":{"description":"Durable identity when storage is configured; otherwise ephemeral instance ID.","format":"uuid","title":"Deployment Id","type":"string"},"event_schema_version":{"const":"1.1","title":"Event Schema Version","type":"string"},"event_stream":{"default":false,"title":"Event Stream","type":"boolean"},"execution_enabled":{"default":false,"title":"Execution Enabled","type":"boolean"},"mode":{"$ref":"#/$defs/DeploymentMode"},"protocol_version":{"const":"1.4","title":"Protocol Version","type":"string"},"runs":{"default":false,"title":"Runs","type":"boolean"},"scope":{"default":"service_skeleton","enum":["service_skeleton","development"],"title":"Scope","type":"string"}},"required":["protocol_version","event_schema_version","deployment_id","mode"],"title":"CapabilitiesResponse","type":"object"};
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
if("1.1" !== data3){
validate22.errors = [{instancePath:instancePath+"/event_schema_version",schemaPath:"#/properties/event_schema_version/const",keyword:"const",params:{allowedValue: "1.1"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs8 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.event_stream !== undefined){
const _errs10 = errors;
if(typeof data.event_stream !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/event_stream",schemaPath:"#/properties/event_stream/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.execution_enabled !== undefined){
const _errs12 = errors;
if(typeof data.execution_enabled !== "boolean"){
validate22.errors = [{instancePath:instancePath+"/execution_enabled",schemaPath:"#/properties/execution_enabled/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
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
if("1.4" !== data7){
validate22.errors = [{instancePath:instancePath+"/protocol_version",schemaPath:"#/properties/protocol_version/const",keyword:"const",params:{allowedValue: "1.4"},message:"must be equal to constant"}];
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

exports.validateRunEvent = validate23;
const schema36 = {"oneOf":[{"$ref":"#/$defs/RunCreatedEvent"},{"$ref":"#/$defs/RunStartedEvent"},{"$ref":"#/$defs/StepStartedEvent"},{"$ref":"#/$defs/ToolStartedEvent"},{"$ref":"#/$defs/ToolCompletedEvent"},{"$ref":"#/$defs/MessageDeltaEvent"},{"$ref":"#/$defs/ApprovalRequestedEvent"},{"$ref":"#/$defs/CancelRequestedEvent"},{"$ref":"#/$defs/RunCompletedEvent"},{"$ref":"#/$defs/RunFailedEvent"},{"$ref":"#/$defs/RunCancelledEvent"},{"$ref":"#/$defs/RecoveryRequiredEvent"},{"$ref":"#/$defs/RecoveryApprovedEvent"}],"title":"Event"};
const schema37 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.created","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/RunCreatedPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"RunCreatedEvent","type":"object"};
const schema38 = {"additionalProperties":false,"properties":{"conversation_id":{"format":"uuid","title":"Conversation Id","type":"string"}},"required":["conversation_id"],"title":"RunCreatedPayload","type":"object"};
const formats2 = require("ajv-formats/dist/formats").fullFormats["date-time"];
const pattern4 = new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$", "u");

function validate24(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate24.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate24.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate24.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate24.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.created" !== data0){
validate24.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.created"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate24.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate24.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate24.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if((data2.conversation_id === undefined) && (missing1 = "conversation_id")){
validate24.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RunCreatedPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!(key1 === "conversation_id")){
validate24.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RunCreatedPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.conversation_id !== undefined){
let data3 = data2.conversation_id;
const _errs10 = errors;
if(errors === _errs10){
if(errors === _errs10){
if(typeof data3 === "string"){
if(!(formats0.test(data3))){
validate24.errors = [{instancePath:instancePath+"/payload/conversation_id",schemaPath:"#/$defs/RunCreatedPayload/properties/conversation_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate24.errors = [{instancePath:instancePath+"/payload/conversation_id",schemaPath:"#/$defs/RunCreatedPayload/properties/conversation_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
}
}
else {
validate24.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RunCreatedPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data4 = data.run_id;
const _errs12 = errors;
if(errors === _errs12){
if(errors === _errs12){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate24.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate24.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data5 = data.schema_version;
const _errs14 = errors;
if(typeof data5 !== "string"){
validate24.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data5 === "1.0") || (data5 === "1.1"))){
validate24.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema37.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data6 = data.seq;
const _errs16 = errors;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
validate24.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs16){
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
validate24.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data6 < 1 || isNaN(data6)){
validate24.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs16 === errors;
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
else {
validate24.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate24.errors = vErrors;
return errors === 0;
}
validate24.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema39 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.started","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/RunStartedPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"RunStartedEvent","type":"object"};
const schema40 = {"additionalProperties":false,"properties":{"attempt_id":{"format":"uuid","title":"Attempt Id","type":"string"}},"required":["attempt_id"],"title":"RunStartedPayload","type":"object"};

function validate26(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate26.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate26.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate26.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate26.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.started" !== data0){
validate26.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.started"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate26.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate26.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate26.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if((data2.attempt_id === undefined) && (missing1 = "attempt_id")){
validate26.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RunStartedPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!(key1 === "attempt_id")){
validate26.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RunStartedPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.attempt_id !== undefined){
let data3 = data2.attempt_id;
const _errs10 = errors;
if(errors === _errs10){
if(errors === _errs10){
if(typeof data3 === "string"){
if(!(formats0.test(data3))){
validate26.errors = [{instancePath:instancePath+"/payload/attempt_id",schemaPath:"#/$defs/RunStartedPayload/properties/attempt_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate26.errors = [{instancePath:instancePath+"/payload/attempt_id",schemaPath:"#/$defs/RunStartedPayload/properties/attempt_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
}
}
}
}
else {
validate26.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RunStartedPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data4 = data.run_id;
const _errs12 = errors;
if(errors === _errs12){
if(errors === _errs12){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate26.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate26.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data5 = data.schema_version;
const _errs14 = errors;
if(typeof data5 !== "string"){
validate26.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data5 === "1.0") || (data5 === "1.1"))){
validate26.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema39.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data6 = data.seq;
const _errs16 = errors;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
validate26.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs16){
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
validate26.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data6 < 1 || isNaN(data6)){
validate26.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs16 === errors;
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
else {
validate26.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate26.errors = vErrors;
return errors === 0;
}
validate26.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema41 = {"additionalProperties":false,"properties":{"event_type":{"const":"step.started","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/StepStartedPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"StepStartedEvent","type":"object"};
const schema42 = {"additionalProperties":false,"properties":{"label":{"maxLength":512,"minLength":1,"title":"Label","type":"string"},"step_id":{"format":"uuid","title":"Step Id","type":"string"}},"required":["step_id","label"],"title":"StepStartedPayload","type":"object"};
const func2 = require("ajv/dist/runtime/ucs2length").default;

function validate28(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate28.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate28.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate28.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate28.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("step.started" !== data0){
validate28.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "step.started"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate28.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate28.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate28.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if(((data2.step_id === undefined) && (missing1 = "step_id")) || ((data2.label === undefined) && (missing1 = "label"))){
validate28.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/StepStartedPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!((key1 === "label") || (key1 === "step_id"))){
validate28.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/StepStartedPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.label !== undefined){
let data3 = data2.label;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func2(data3) > 512){
validate28.errors = [{instancePath:instancePath+"/payload/label",schemaPath:"#/$defs/StepStartedPayload/properties/label/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data3) < 1){
validate28.errors = [{instancePath:instancePath+"/payload/label",schemaPath:"#/$defs/StepStartedPayload/properties/label/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate28.errors = [{instancePath:instancePath+"/payload/label",schemaPath:"#/$defs/StepStartedPayload/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.step_id !== undefined){
let data4 = data2.step_id;
const _errs12 = errors;
if(errors === _errs12){
if(errors === _errs12){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate28.errors = [{instancePath:instancePath+"/payload/step_id",schemaPath:"#/$defs/StepStartedPayload/properties/step_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate28.errors = [{instancePath:instancePath+"/payload/step_id",schemaPath:"#/$defs/StepStartedPayload/properties/step_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
else {
validate28.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/StepStartedPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data5 = data.run_id;
const _errs14 = errors;
if(errors === _errs14){
if(errors === _errs14){
if(typeof data5 === "string"){
if(!(formats0.test(data5))){
validate28.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate28.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data6 = data.schema_version;
const _errs16 = errors;
if(typeof data6 !== "string"){
validate28.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data6 === "1.0") || (data6 === "1.1"))){
validate28.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema41.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data7 = data.seq;
const _errs18 = errors;
if(!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))){
validate28.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 9007199254740991 || isNaN(data7)){
validate28.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data7 < 1 || isNaN(data7)){
validate28.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs18 === errors;
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
else {
validate28.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate28.errors = vErrors;
return errors === 0;
}
validate28.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema43 = {"additionalProperties":false,"properties":{"event_type":{"const":"tool.started","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/ToolStartedPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"ToolStartedEvent","type":"object"};
const schema44 = {"additionalProperties":false,"properties":{"tool_call_id":{"format":"uuid","title":"Tool Call Id","type":"string"},"tool_name":{"maxLength":512,"minLength":1,"title":"Tool Name","type":"string"}},"required":["tool_call_id","tool_name"],"title":"ToolStartedPayload","type":"object"};

function validate30(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate30.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate30.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate30.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate30.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("tool.started" !== data0){
validate30.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "tool.started"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate30.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate30.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate30.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if(((data2.tool_call_id === undefined) && (missing1 = "tool_call_id")) || ((data2.tool_name === undefined) && (missing1 = "tool_name"))){
validate30.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/ToolStartedPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!((key1 === "tool_call_id") || (key1 === "tool_name"))){
validate30.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/ToolStartedPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.tool_call_id !== undefined){
let data3 = data2.tool_call_id;
const _errs10 = errors;
if(errors === _errs10){
if(errors === _errs10){
if(typeof data3 === "string"){
if(!(formats0.test(data3))){
validate30.errors = [{instancePath:instancePath+"/payload/tool_call_id",schemaPath:"#/$defs/ToolStartedPayload/properties/tool_call_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate30.errors = [{instancePath:instancePath+"/payload/tool_call_id",schemaPath:"#/$defs/ToolStartedPayload/properties/tool_call_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.tool_name !== undefined){
let data4 = data2.tool_name;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data4 === "string"){
if(func2(data4) > 512){
validate30.errors = [{instancePath:instancePath+"/payload/tool_name",schemaPath:"#/$defs/ToolStartedPayload/properties/tool_name/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data4) < 1){
validate30.errors = [{instancePath:instancePath+"/payload/tool_name",schemaPath:"#/$defs/ToolStartedPayload/properties/tool_name/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate30.errors = [{instancePath:instancePath+"/payload/tool_name",schemaPath:"#/$defs/ToolStartedPayload/properties/tool_name/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
else {
validate30.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/ToolStartedPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data5 = data.run_id;
const _errs14 = errors;
if(errors === _errs14){
if(errors === _errs14){
if(typeof data5 === "string"){
if(!(formats0.test(data5))){
validate30.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate30.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data6 = data.schema_version;
const _errs16 = errors;
if(typeof data6 !== "string"){
validate30.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data6 === "1.0") || (data6 === "1.1"))){
validate30.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema43.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data7 = data.seq;
const _errs18 = errors;
if(!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))){
validate30.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 9007199254740991 || isNaN(data7)){
validate30.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data7 < 1 || isNaN(data7)){
validate30.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs18 === errors;
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
else {
validate30.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate30.errors = vErrors;
return errors === 0;
}
validate30.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema45 = {"additionalProperties":false,"properties":{"event_type":{"const":"tool.completed","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/ToolResult"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"ToolCompletedEvent","type":"object"};
const schema46 = {"additionalProperties":false,"properties":{"evidence":{"items":{"$ref":"#/$defs/EvidenceReference"},"title":"Evidence","type":"array"},"status":{"enum":["succeeded","failed","unknown"],"title":"Status","type":"string"},"summary":{"maxLength":512,"minLength":1,"title":"Summary","type":"string"},"tool_call_id":{"format":"uuid","title":"Tool Call Id","type":"string"}},"required":["tool_call_id","status","summary","evidence"],"title":"ToolResult","type":"object"};
const schema47 = {"additionalProperties":false,"properties":{"artifact_id":{"anyOf":[{"format":"uuid","type":"string"},{"type":"null"}],"description":"Authorized resource ID, never an arbitrary filesystem path.","title":"Artifact Id"},"collected_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Collected At","type":"string"},"evidence_id":{"format":"uuid","title":"Evidence Id","type":"string"},"source":{"maxLength":512,"minLength":1,"title":"Source","type":"string"},"summary":{"maxLength":512,"minLength":1,"title":"Summary","type":"string"},"tool_call_id":{"format":"uuid","title":"Tool Call Id","type":"string"}},"required":["evidence_id","tool_call_id","source","collected_at","summary","artifact_id"],"title":"EvidenceReference","type":"object"};

function validate33(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate33.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((data.tool_call_id === undefined) && (missing0 = "tool_call_id")) || ((data.status === undefined) && (missing0 = "status"))) || ((data.summary === undefined) && (missing0 = "summary"))) || ((data.evidence === undefined) && (missing0 = "evidence"))){
validate33.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((key0 === "evidence") || (key0 === "status")) || (key0 === "summary")) || (key0 === "tool_call_id"))){
validate33.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.evidence !== undefined){
let data0 = data.evidence;
const _errs2 = errors;
if(errors === _errs2){
if(Array.isArray(data0)){
var valid1 = true;
const len0 = data0.length;
for(let i0=0; i0<len0; i0++){
let data1 = data0[i0];
const _errs4 = errors;
const _errs5 = errors;
if(errors === _errs5){
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
let missing1;
if(((((((data1.evidence_id === undefined) && (missing1 = "evidence_id")) || ((data1.tool_call_id === undefined) && (missing1 = "tool_call_id"))) || ((data1.source === undefined) && (missing1 = "source"))) || ((data1.collected_at === undefined) && (missing1 = "collected_at"))) || ((data1.summary === undefined) && (missing1 = "summary"))) || ((data1.artifact_id === undefined) && (missing1 = "artifact_id"))){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0,schemaPath:"#/$defs/EvidenceReference/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs7 = errors;
for(const key1 in data1){
if(!((((((key1 === "artifact_id") || (key1 === "collected_at")) || (key1 === "evidence_id")) || (key1 === "source")) || (key1 === "summary")) || (key1 === "tool_call_id"))){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0,schemaPath:"#/$defs/EvidenceReference/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs7 === errors){
if(data1.artifact_id !== undefined){
let data2 = data1.artifact_id;
const _errs8 = errors;
const _errs9 = errors;
let valid4 = false;
const _errs10 = errors;
if(errors === _errs10){
if(errors === _errs10){
if(typeof data2 === "string"){
if(!(formats0.test(data2))){
const err0 = {instancePath:instancePath+"/evidence/" + i0+"/artifact_id",schemaPath:"#/$defs/EvidenceReference/properties/artifact_id/anyOf/0/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath:instancePath+"/evidence/" + i0+"/artifact_id",schemaPath:"#/$defs/EvidenceReference/properties/artifact_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
var _valid0 = _errs10 === errors;
valid4 = valid4 || _valid0;
const _errs12 = errors;
if(data2 !== null){
const err2 = {instancePath:instancePath+"/evidence/" + i0+"/artifact_id",schemaPath:"#/$defs/EvidenceReference/properties/artifact_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var _valid0 = _errs12 === errors;
valid4 = valid4 || _valid0;
if(!valid4){
const err3 = {instancePath:instancePath+"/evidence/" + i0+"/artifact_id",schemaPath:"#/$defs/EvidenceReference/properties/artifact_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate33.errors = vErrors;
return false;
}
else {
errors = _errs9;
if(vErrors !== null){
if(_errs9){
vErrors.length = _errs9;
}
else {
vErrors = null;
}
}
}
var valid3 = _errs8 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.collected_at !== undefined){
let data3 = data1.collected_at;
const _errs14 = errors;
if(errors === _errs14){
if(errors === _errs14){
if(typeof data3 === "string"){
if(!pattern4.test(data3)){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/collected_at",schemaPath:"#/$defs/EvidenceReference/properties/collected_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data3))){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/collected_at",schemaPath:"#/$defs/EvidenceReference/properties/collected_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/collected_at",schemaPath:"#/$defs/EvidenceReference/properties/collected_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid3 = _errs14 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.evidence_id !== undefined){
let data4 = data1.evidence_id;
const _errs16 = errors;
if(errors === _errs16){
if(errors === _errs16){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/evidence_id",schemaPath:"#/$defs/EvidenceReference/properties/evidence_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/evidence_id",schemaPath:"#/$defs/EvidenceReference/properties/evidence_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid3 = _errs16 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.source !== undefined){
let data5 = data1.source;
const _errs18 = errors;
if(errors === _errs18){
if(typeof data5 === "string"){
if(func2(data5) > 512){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/source",schemaPath:"#/$defs/EvidenceReference/properties/source/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data5) < 1){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/source",schemaPath:"#/$defs/EvidenceReference/properties/source/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/source",schemaPath:"#/$defs/EvidenceReference/properties/source/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid3 = _errs18 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.summary !== undefined){
let data6 = data1.summary;
const _errs20 = errors;
if(errors === _errs20){
if(typeof data6 === "string"){
if(func2(data6) > 512){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/summary",schemaPath:"#/$defs/EvidenceReference/properties/summary/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data6) < 1){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/summary",schemaPath:"#/$defs/EvidenceReference/properties/summary/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/summary",schemaPath:"#/$defs/EvidenceReference/properties/summary/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid3 = _errs20 === errors;
}
else {
var valid3 = true;
}
if(valid3){
if(data1.tool_call_id !== undefined){
let data7 = data1.tool_call_id;
const _errs22 = errors;
if(errors === _errs22){
if(errors === _errs22){
if(typeof data7 === "string"){
if(!(formats0.test(data7))){
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/tool_call_id",schemaPath:"#/$defs/EvidenceReference/properties/tool_call_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0+"/tool_call_id",schemaPath:"#/$defs/EvidenceReference/properties/tool_call_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid3 = _errs22 === errors;
}
else {
var valid3 = true;
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
validate33.errors = [{instancePath:instancePath+"/evidence/" + i0,schemaPath:"#/$defs/EvidenceReference/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid1 = _errs4 === errors;
if(!valid1){
break;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/evidence",schemaPath:"#/properties/evidence/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.status !== undefined){
let data8 = data.status;
const _errs24 = errors;
if(typeof data8 !== "string"){
validate33.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data8 === "succeeded") || (data8 === "failed")) || (data8 === "unknown"))){
validate33.errors = [{instancePath:instancePath+"/status",schemaPath:"#/properties/status/enum",keyword:"enum",params:{allowedValues: schema46.properties.status.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.summary !== undefined){
let data9 = data.summary;
const _errs26 = errors;
if(errors === _errs26){
if(typeof data9 === "string"){
if(func2(data9) > 512){
validate33.errors = [{instancePath:instancePath+"/summary",schemaPath:"#/properties/summary/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data9) < 1){
validate33.errors = [{instancePath:instancePath+"/summary",schemaPath:"#/properties/summary/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate33.errors = [{instancePath:instancePath+"/summary",schemaPath:"#/properties/summary/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs26 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tool_call_id !== undefined){
let data10 = data.tool_call_id;
const _errs28 = errors;
if(errors === _errs28){
if(errors === _errs28){
if(typeof data10 === "string"){
if(!(formats0.test(data10))){
validate33.errors = [{instancePath:instancePath+"/tool_call_id",schemaPath:"#/properties/tool_call_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate33.errors = [{instancePath:instancePath+"/tool_call_id",schemaPath:"#/properties/tool_call_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs28 === errors;
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
else {
validate33.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate33.errors = vErrors;
return errors === 0;
}
validate33.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate32(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate32.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate32.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate32.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate32.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("tool.completed" !== data0){
validate32.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "tool.completed"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate32.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate32.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate32.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
const _errs6 = errors;
if(!(validate33(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data3 = data.run_id;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data3 === "string"){
if(!(formats0.test(data3))){
validate32.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate32.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data4 = data.schema_version;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate32.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data4 === "1.0") || (data4 === "1.1"))){
validate32.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema45.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data5 = data.seq;
const _errs11 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate32.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs11){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate32.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate32.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
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
else {
validate32.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate32.errors = vErrors;
return errors === 0;
}
validate32.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema48 = {"additionalProperties":false,"properties":{"event_type":{"const":"message.delta","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/MessageDeltaPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"MessageDeltaEvent","type":"object"};
const schema49 = {"additionalProperties":false,"properties":{"delta":{"maxLength":32000,"minLength":1,"title":"Delta","type":"string"},"message_id":{"format":"uuid","title":"Message Id","type":"string"}},"required":["message_id","delta"],"title":"MessageDeltaPayload","type":"object"};

function validate36(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate36.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate36.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate36.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate36.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("message.delta" !== data0){
validate36.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "message.delta"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate36.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate36.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate36.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if(((data2.message_id === undefined) && (missing1 = "message_id")) || ((data2.delta === undefined) && (missing1 = "delta"))){
validate36.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/MessageDeltaPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!((key1 === "delta") || (key1 === "message_id"))){
validate36.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/MessageDeltaPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.delta !== undefined){
let data3 = data2.delta;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func2(data3) > 32000){
validate36.errors = [{instancePath:instancePath+"/payload/delta",schemaPath:"#/$defs/MessageDeltaPayload/properties/delta/maxLength",keyword:"maxLength",params:{limit: 32000},message:"must NOT have more than 32000 characters"}];
return false;
}
else {
if(func2(data3) < 1){
validate36.errors = [{instancePath:instancePath+"/payload/delta",schemaPath:"#/$defs/MessageDeltaPayload/properties/delta/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate36.errors = [{instancePath:instancePath+"/payload/delta",schemaPath:"#/$defs/MessageDeltaPayload/properties/delta/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.message_id !== undefined){
let data4 = data2.message_id;
const _errs12 = errors;
if(errors === _errs12){
if(errors === _errs12){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate36.errors = [{instancePath:instancePath+"/payload/message_id",schemaPath:"#/$defs/MessageDeltaPayload/properties/message_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate36.errors = [{instancePath:instancePath+"/payload/message_id",schemaPath:"#/$defs/MessageDeltaPayload/properties/message_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
else {
validate36.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/MessageDeltaPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data5 = data.run_id;
const _errs14 = errors;
if(errors === _errs14){
if(errors === _errs14){
if(typeof data5 === "string"){
if(!(formats0.test(data5))){
validate36.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate36.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data6 = data.schema_version;
const _errs16 = errors;
if(typeof data6 !== "string"){
validate36.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data6 === "1.0") || (data6 === "1.1"))){
validate36.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema48.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data7 = data.seq;
const _errs18 = errors;
if(!(((typeof data7 == "number") && (!(data7 % 1) && !isNaN(data7))) && (isFinite(data7)))){
validate36.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs18){
if((typeof data7 == "number") && (isFinite(data7))){
if(data7 > 9007199254740991 || isNaN(data7)){
validate36.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data7 < 1 || isNaN(data7)){
validate36.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs18 === errors;
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
else {
validate36.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate36.errors = vErrors;
return errors === 0;
}
validate36.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema50 = {"additionalProperties":false,"properties":{"event_type":{"const":"approval.requested","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/ActionProposal"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"ApprovalRequestedEvent","type":"object"};
const schema51 = {"additionalProperties":false,"properties":{"expires_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Expires At","type":"string"},"impact":{"maxLength":512,"minLength":1,"title":"Impact","type":"string"},"parameters":{"additionalProperties":{"$ref":"#/$defs/JsonValue"},"description":"Connector-specific validation and sanitization required before use.","title":"Parameters","type":"object"},"proposal_id":{"format":"uuid","title":"Proposal Id","type":"string"},"revision":{"maximum":9007199254740991,"minimum":1,"title":"Revision","type":"integer"},"target":{"maxLength":512,"minLength":1,"title":"Target","type":"string"},"tool_name":{"maxLength":512,"minLength":1,"title":"Tool Name","type":"string"}},"required":["proposal_id","tool_name","target","parameters","impact","expires_at","revision"],"title":"ActionProposal","type":"object"};
const schema52 = {};

function validate39(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate39.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((((((((data.proposal_id === undefined) && (missing0 = "proposal_id")) || ((data.tool_name === undefined) && (missing0 = "tool_name"))) || ((data.target === undefined) && (missing0 = "target"))) || ((data.parameters === undefined) && (missing0 = "parameters"))) || ((data.impact === undefined) && (missing0 = "impact"))) || ((data.expires_at === undefined) && (missing0 = "expires_at"))) || ((data.revision === undefined) && (missing0 = "revision"))){
validate39.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(((((((key0 === "expires_at") || (key0 === "impact")) || (key0 === "parameters")) || (key0 === "proposal_id")) || (key0 === "revision")) || (key0 === "target")) || (key0 === "tool_name"))){
validate39.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.expires_at !== undefined){
let data0 = data.expires_at;
const _errs2 = errors;
if(errors === _errs2){
if(errors === _errs2){
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
validate39.errors = [{instancePath:instancePath+"/expires_at",schemaPath:"#/properties/expires_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data0))){
validate39.errors = [{instancePath:instancePath+"/expires_at",schemaPath:"#/properties/expires_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/expires_at",schemaPath:"#/properties/expires_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.impact !== undefined){
let data1 = data.impact;
const _errs4 = errors;
if(errors === _errs4){
if(typeof data1 === "string"){
if(func2(data1) > 512){
validate39.errors = [{instancePath:instancePath+"/impact",schemaPath:"#/properties/impact/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data1) < 1){
validate39.errors = [{instancePath:instancePath+"/impact",schemaPath:"#/properties/impact/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/impact",schemaPath:"#/properties/impact/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.parameters !== undefined){
let data2 = data.parameters;
const _errs6 = errors;
if(errors === _errs6){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
for(const key1 in data2){
const _errs9 = errors;
var valid1 = _errs9 === errors;
if(!valid1){
break;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/parameters",schemaPath:"#/properties/parameters/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.proposal_id !== undefined){
let data4 = data.proposal_id;
const _errs10 = errors;
if(errors === _errs10){
if(errors === _errs10){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate39.errors = [{instancePath:instancePath+"/proposal_id",schemaPath:"#/properties/proposal_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate39.errors = [{instancePath:instancePath+"/proposal_id",schemaPath:"#/properties/proposal_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs10 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.revision !== undefined){
let data5 = data.revision;
const _errs12 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate39.errors = [{instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs12){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate39.errors = [{instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate39.errors = [{instancePath:instancePath+"/revision",schemaPath:"#/properties/revision/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs12 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.target !== undefined){
let data6 = data.target;
const _errs14 = errors;
if(errors === _errs14){
if(typeof data6 === "string"){
if(func2(data6) > 512){
validate39.errors = [{instancePath:instancePath+"/target",schemaPath:"#/properties/target/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data6) < 1){
validate39.errors = [{instancePath:instancePath+"/target",schemaPath:"#/properties/target/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/target",schemaPath:"#/properties/target/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs14 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.tool_name !== undefined){
let data7 = data.tool_name;
const _errs16 = errors;
if(errors === _errs16){
if(typeof data7 === "string"){
if(func2(data7) > 512){
validate39.errors = [{instancePath:instancePath+"/tool_name",schemaPath:"#/properties/tool_name/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data7) < 1){
validate39.errors = [{instancePath:instancePath+"/tool_name",schemaPath:"#/properties/tool_name/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate39.errors = [{instancePath:instancePath+"/tool_name",schemaPath:"#/properties/tool_name/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid0 = _errs16 === errors;
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
else {
validate39.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate39.errors = vErrors;
return errors === 0;
}
validate39.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate38(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate38.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate38.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate38.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate38.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("approval.requested" !== data0){
validate38.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "approval.requested"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate38.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate38.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate38.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
const _errs6 = errors;
if(!(validate39(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate39.errors : vErrors.concat(validate39.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data3 = data.run_id;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data3 === "string"){
if(!(formats0.test(data3))){
validate38.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate38.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data4 = data.schema_version;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate38.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data4 === "1.0") || (data4 === "1.1"))){
validate38.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema50.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data5 = data.seq;
const _errs11 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate38.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs11){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate38.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate38.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
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
else {
validate38.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate38.errors = vErrors;
return errors === 0;
}
validate38.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema53 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.cancel_requested","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/CancelPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"CancelRequestedEvent","type":"object"};
const schema54 = {"additionalProperties":false,"properties":{"reason":{"anyOf":[{"maxLength":512,"minLength":1,"type":"string"},{"type":"null"}],"title":"Reason"}},"required":["reason"],"title":"CancelPayload","type":"object"};

function validate42(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate42.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate42.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate42.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate42.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.cancel_requested" !== data0){
validate42.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.cancel_requested"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate42.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate42.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate42.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if((data2.reason === undefined) && (missing1 = "reason")){
validate42.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/CancelPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!(key1 === "reason")){
validate42.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/CancelPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.reason !== undefined){
let data3 = data2.reason;
const _errs11 = errors;
let valid3 = false;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data3 === "string"){
if(func2(data3) > 512){
const err0 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func2(data3) < 1){
const err1 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs12 === errors;
valid3 = valid3 || _valid0;
const _errs14 = errors;
if(data3 !== null){
const err3 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs14 === errors;
valid3 = valid3 || _valid0;
if(!valid3){
const err4 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate42.errors = vErrors;
return false;
}
else {
errors = _errs11;
if(vErrors !== null){
if(_errs11){
vErrors.length = _errs11;
}
else {
vErrors = null;
}
}
}
}
}
}
}
else {
validate42.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/CancelPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data4 = data.run_id;
const _errs16 = errors;
if(errors === _errs16){
if(errors === _errs16){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate42.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate42.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data5 = data.schema_version;
const _errs18 = errors;
if(typeof data5 !== "string"){
validate42.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data5 === "1.0") || (data5 === "1.1"))){
validate42.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema53.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data6 = data.seq;
const _errs20 = errors;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
validate42.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs20){
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
validate42.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data6 < 1 || isNaN(data6)){
validate42.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs20 === errors;
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
else {
validate42.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate42.errors = vErrors;
return errors === 0;
}
validate42.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema55 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.completed","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/RunCompletedPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"RunCompletedEvent","type":"object"};
const schema56 = {"additionalProperties":false,"properties":{"message_id":{"format":"uuid","title":"Message Id","type":"string"},"resolution_status":{"$ref":"#/$defs/ResolutionStatus"}},"required":["message_id","resolution_status"],"title":"RunCompletedPayload","type":"object"};
const schema57 = {"enum":["unresolved","resolved","unknown"],"title":"ResolutionStatus","type":"string"};

function validate45(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate45.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((data.message_id === undefined) && (missing0 = "message_id")) || ((data.resolution_status === undefined) && (missing0 = "resolution_status"))){
validate45.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((key0 === "message_id") || (key0 === "resolution_status"))){
validate45.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.message_id !== undefined){
let data0 = data.message_id;
const _errs2 = errors;
if(errors === _errs2){
if(errors === _errs2){
if(typeof data0 === "string"){
if(!(formats0.test(data0))){
validate45.errors = [{instancePath:instancePath+"/message_id",schemaPath:"#/properties/message_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate45.errors = [{instancePath:instancePath+"/message_id",schemaPath:"#/properties/message_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.resolution_status !== undefined){
let data1 = data.resolution_status;
const _errs4 = errors;
if(typeof data1 !== "string"){
validate45.errors = [{instancePath:instancePath+"/resolution_status",schemaPath:"#/$defs/ResolutionStatus/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((data1 === "unresolved") || (data1 === "resolved")) || (data1 === "unknown"))){
validate45.errors = [{instancePath:instancePath+"/resolution_status",schemaPath:"#/$defs/ResolutionStatus/enum",keyword:"enum",params:{allowedValues: schema57.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
}
}
}
}
else {
validate45.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate45.errors = vErrors;
return errors === 0;
}
validate45.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate44(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate44.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate44.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate44.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate44.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.completed" !== data0){
validate44.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.completed"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate44.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate44.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate44.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
const _errs6 = errors;
if(!(validate45(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data3 = data.run_id;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data3 === "string"){
if(!(formats0.test(data3))){
validate44.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate44.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data4 = data.schema_version;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate44.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data4 === "1.0") || (data4 === "1.1"))){
validate44.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema55.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data5 = data.seq;
const _errs11 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate44.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs11){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate44.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate44.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
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
else {
validate44.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate44.errors = vErrors;
return errors === 0;
}
validate44.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema58 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.failed","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/RunFailedPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"RunFailedEvent","type":"object"};
const schema59 = {"additionalProperties":false,"properties":{"error":{"$ref":"#/$defs/ErrorDetail"}},"required":["error"],"title":"RunFailedPayload","type":"object"};
const schema60 = {"additionalProperties":false,"properties":{"code":{"enum":["invalid_request","incompatible_protocol","unauthenticated","forbidden","not_found","conflict","idempotency_conflict","cursor_expired","not_ready","model_unavailable","tool_failed","budget_exceeded","internal_error"],"title":"Code","type":"string"},"message":{"description":"Sanitized user-facing message; never raw input or exception text.","maxLength":512,"minLength":1,"title":"Message","type":"string"},"retryable":{"title":"Retryable","type":"boolean"}},"required":["code","message","retryable"],"title":"ErrorDetail","type":"object"};

function validate49(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate49.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if((data.error === undefined) && (missing0 = "error")){
validate49.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!(key0 === "error")){
validate49.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.error !== undefined){
let data0 = data.error;
const _errs3 = errors;
if(errors === _errs3){
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
let missing1;
if((((data0.code === undefined) && (missing1 = "code")) || ((data0.message === undefined) && (missing1 = "message"))) || ((data0.retryable === undefined) && (missing1 = "retryable"))){
validate49.errors = [{instancePath:instancePath+"/error",schemaPath:"#/$defs/ErrorDetail/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs5 = errors;
for(const key1 in data0){
if(!(((key1 === "code") || (key1 === "message")) || (key1 === "retryable"))){
validate49.errors = [{instancePath:instancePath+"/error",schemaPath:"#/$defs/ErrorDetail/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs5 === errors){
if(data0.code !== undefined){
let data1 = data0.code;
const _errs6 = errors;
if(typeof data1 !== "string"){
validate49.errors = [{instancePath:instancePath+"/error/code",schemaPath:"#/$defs/ErrorDetail/properties/code/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!(((((((((((((data1 === "invalid_request") || (data1 === "incompatible_protocol")) || (data1 === "unauthenticated")) || (data1 === "forbidden")) || (data1 === "not_found")) || (data1 === "conflict")) || (data1 === "idempotency_conflict")) || (data1 === "cursor_expired")) || (data1 === "not_ready")) || (data1 === "model_unavailable")) || (data1 === "tool_failed")) || (data1 === "budget_exceeded")) || (data1 === "internal_error"))){
validate49.errors = [{instancePath:instancePath+"/error/code",schemaPath:"#/$defs/ErrorDetail/properties/code/enum",keyword:"enum",params:{allowedValues: schema60.properties.code.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid2 = _errs6 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data0.message !== undefined){
let data2 = data0.message;
const _errs8 = errors;
if(errors === _errs8){
if(typeof data2 === "string"){
if(func2(data2) > 512){
validate49.errors = [{instancePath:instancePath+"/error/message",schemaPath:"#/$defs/ErrorDetail/properties/message/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data2) < 1){
validate49.errors = [{instancePath:instancePath+"/error/message",schemaPath:"#/$defs/ErrorDetail/properties/message/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/error/message",schemaPath:"#/$defs/ErrorDetail/properties/message/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs8 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data0.retryable !== undefined){
const _errs10 = errors;
if(typeof data0.retryable !== "boolean"){
validate49.errors = [{instancePath:instancePath+"/error/retryable",schemaPath:"#/$defs/ErrorDetail/properties/retryable/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"}];
return false;
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
else {
validate49.errors = [{instancePath:instancePath+"/error",schemaPath:"#/$defs/ErrorDetail/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
}
}
}
}
else {
validate49.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate49.errors = vErrors;
return errors === 0;
}
validate49.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate48(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate48.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate48.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate48.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate48.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.failed" !== data0){
validate48.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.failed"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate48.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate48.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate48.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
const _errs6 = errors;
if(!(validate49(data.payload, {instancePath:instancePath+"/payload",parentData:data,parentDataProperty:"payload",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate49.errors : vErrors.concat(validate49.errors);
errors = vErrors.length;
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data3 = data.run_id;
const _errs7 = errors;
if(errors === _errs7){
if(errors === _errs7){
if(typeof data3 === "string"){
if(!(formats0.test(data3))){
validate48.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate48.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs7 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data4 = data.schema_version;
const _errs9 = errors;
if(typeof data4 !== "string"){
validate48.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data4 === "1.0") || (data4 === "1.1"))){
validate48.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema58.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs9 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data5 = data.seq;
const _errs11 = errors;
if(!(((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5))) && (isFinite(data5)))){
validate48.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs11){
if((typeof data5 == "number") && (isFinite(data5))){
if(data5 > 9007199254740991 || isNaN(data5)){
validate48.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data5 < 1 || isNaN(data5)){
validate48.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs11 === errors;
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
else {
validate48.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate48.errors = vErrors;
return errors === 0;
}
validate48.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema61 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.cancelled","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/CancelPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"RunCancelledEvent","type":"object"};

function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate52.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate52.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate52.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate52.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.cancelled" !== data0){
validate52.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.cancelled"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate52.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate52.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if((data2.reason === undefined) && (missing1 = "reason")){
validate52.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/CancelPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!(key1 === "reason")){
validate52.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/CancelPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.reason !== undefined){
let data3 = data2.reason;
const _errs11 = errors;
let valid3 = false;
const _errs12 = errors;
if(errors === _errs12){
if(typeof data3 === "string"){
if(func2(data3) > 512){
const err0 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/0/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
if(func2(data3) < 1){
const err1 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/0/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
var _valid0 = _errs12 === errors;
valid3 = valid3 || _valid0;
const _errs14 = errors;
if(data3 !== null){
const err3 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
var _valid0 = _errs14 === errors;
valid3 = valid3 || _valid0;
if(!valid3){
const err4 = {instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/CancelPayload/properties/reason/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
validate52.errors = vErrors;
return false;
}
else {
errors = _errs11;
if(vErrors !== null){
if(_errs11){
vErrors.length = _errs11;
}
else {
vErrors = null;
}
}
}
}
}
}
}
else {
validate52.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/CancelPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data4 = data.run_id;
const _errs16 = errors;
if(errors === _errs16){
if(errors === _errs16){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
validate52.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate52.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data5 = data.schema_version;
const _errs18 = errors;
if(typeof data5 !== "string"){
validate52.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data5 === "1.0") || (data5 === "1.1"))){
validate52.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema61.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data6 = data.seq;
const _errs20 = errors;
if(!(((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6))) && (isFinite(data6)))){
validate52.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs20){
if((typeof data6 == "number") && (isFinite(data6))){
if(data6 > 9007199254740991 || isNaN(data6)){
validate52.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data6 < 1 || isNaN(data6)){
validate52.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs20 === errors;
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
else {
validate52.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate52.errors = vErrors;
return errors === 0;
}
validate52.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema63 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.recovery_required","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/RecoveryRequiredPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"enum":["1.0","1.1"],"title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"RecoveryRequiredEvent","type":"object"};
const schema64 = {"additionalProperties":false,"properties":{"reason":{"maxLength":512,"minLength":1,"title":"Reason","type":"string"},"unknown_tool_call_ids":{"items":{"format":"uuid","type":"string"},"title":"Unknown Tool Call Ids","type":"array"}},"required":["reason","unknown_tool_call_ids"],"title":"RecoveryRequiredPayload","type":"object"};

function validate54(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate54.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate54.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate54.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate54.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.recovery_required" !== data0){
validate54.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.recovery_required"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate54.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate54.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if(((data2.reason === undefined) && (missing1 = "reason")) || ((data2.unknown_tool_call_ids === undefined) && (missing1 = "unknown_tool_call_ids"))){
validate54.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RecoveryRequiredPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!((key1 === "reason") || (key1 === "unknown_tool_call_ids"))){
validate54.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RecoveryRequiredPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.reason !== undefined){
let data3 = data2.reason;
const _errs10 = errors;
if(errors === _errs10){
if(typeof data3 === "string"){
if(func2(data3) > 512){
validate54.errors = [{instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/RecoveryRequiredPayload/properties/reason/maxLength",keyword:"maxLength",params:{limit: 512},message:"must NOT have more than 512 characters"}];
return false;
}
else {
if(func2(data3) < 1){
validate54.errors = [{instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/RecoveryRequiredPayload/properties/reason/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"}];
return false;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/payload/reason",schemaPath:"#/$defs/RecoveryRequiredPayload/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.unknown_tool_call_ids !== undefined){
let data4 = data2.unknown_tool_call_ids;
const _errs12 = errors;
if(errors === _errs12){
if(Array.isArray(data4)){
var valid3 = true;
const len0 = data4.length;
for(let i0=0; i0<len0; i0++){
let data5 = data4[i0];
const _errs14 = errors;
if(errors === _errs14){
if(errors === _errs14){
if(typeof data5 === "string"){
if(!(formats0.test(data5))){
validate54.errors = [{instancePath:instancePath+"/payload/unknown_tool_call_ids/" + i0,schemaPath:"#/$defs/RecoveryRequiredPayload/properties/unknown_tool_call_ids/items/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate54.errors = [{instancePath:instancePath+"/payload/unknown_tool_call_ids/" + i0,schemaPath:"#/$defs/RecoveryRequiredPayload/properties/unknown_tool_call_ids/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid3 = _errs14 === errors;
if(!valid3){
break;
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/payload/unknown_tool_call_ids",schemaPath:"#/$defs/RecoveryRequiredPayload/properties/unknown_tool_call_ids/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
else {
validate54.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RecoveryRequiredPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data6 = data.run_id;
const _errs16 = errors;
if(errors === _errs16){
if(errors === _errs16){
if(typeof data6 === "string"){
if(!(formats0.test(data6))){
validate54.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate54.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs16 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data7 = data.schema_version;
const _errs18 = errors;
if(typeof data7 !== "string"){
validate54.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if(!((data7 === "1.0") || (data7 === "1.1"))){
validate54.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/enum",keyword:"enum",params:{allowedValues: schema63.properties.schema_version.enum},message:"must be equal to one of the allowed values"}];
return false;
}
var valid0 = _errs18 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data8 = data.seq;
const _errs20 = errors;
if(!(((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8))) && (isFinite(data8)))){
validate54.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs20){
if((typeof data8 == "number") && (isFinite(data8))){
if(data8 > 9007199254740991 || isNaN(data8)){
validate54.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data8 < 1 || isNaN(data8)){
validate54.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs20 === errors;
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
else {
validate54.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate54.errors = vErrors;
return errors === 0;
}
validate54.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema65 = {"additionalProperties":false,"properties":{"event_type":{"const":"run.recovery_approved","title":"Event Type","type":"string"},"occurred_at":{"description":"UTC timestamp (Z or +00:00).","format":"date-time","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$","title":"Occurred At","type":"string"},"payload":{"$ref":"#/$defs/RecoveryApprovedPayload"},"run_id":{"format":"uuid","title":"Run Id","type":"string"},"schema_version":{"const":"1.1","title":"Schema Version","type":"string"},"seq":{"maximum":9007199254740991,"minimum":1,"title":"Seq","type":"integer"}},"required":["schema_version","run_id","seq","occurred_at","event_type","payload"],"title":"RecoveryApprovedEvent","type":"object"};
const schema66 = {"additionalProperties":false,"properties":{"decision":{"const":"retry_mock_reads","title":"Decision","type":"string"},"prior_attempt_id":{"anyOf":[{"format":"uuid","type":"string"},{"type":"null"}],"title":"Prior Attempt Id"},"reviewed_tool_call_ids":{"items":{"format":"uuid","type":"string"},"title":"Reviewed Tool Call Ids","type":"array"}},"required":["prior_attempt_id","reviewed_tool_call_ids","decision"],"title":"RecoveryApprovedPayload","type":"object"};

function validate56(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate56.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(errors === 0){
if(data && typeof data == "object" && !Array.isArray(data)){
let missing0;
if(((((((data.schema_version === undefined) && (missing0 = "schema_version")) || ((data.run_id === undefined) && (missing0 = "run_id"))) || ((data.seq === undefined) && (missing0 = "seq"))) || ((data.occurred_at === undefined) && (missing0 = "occurred_at"))) || ((data.event_type === undefined) && (missing0 = "event_type"))) || ((data.payload === undefined) && (missing0 = "payload"))){
validate56.errors = [{instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: missing0},message:"must have required property '"+missing0+"'"}];
return false;
}
else {
const _errs1 = errors;
for(const key0 in data){
if(!((((((key0 === "event_type") || (key0 === "occurred_at")) || (key0 === "payload")) || (key0 === "run_id")) || (key0 === "schema_version")) || (key0 === "seq"))){
validate56.errors = [{instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs1 === errors){
if(data.event_type !== undefined){
let data0 = data.event_type;
const _errs2 = errors;
if(typeof data0 !== "string"){
validate56.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("run.recovery_approved" !== data0){
validate56.errors = [{instancePath:instancePath+"/event_type",schemaPath:"#/properties/event_type/const",keyword:"const",params:{allowedValue: "run.recovery_approved"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs2 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.occurred_at !== undefined){
let data1 = data.occurred_at;
const _errs4 = errors;
if(errors === _errs4){
if(errors === _errs4){
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
validate56.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"},message:"must match pattern \""+"^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt][0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?(?:[Zz]|\\+00:00)$"+"\""}];
return false;
}
else {
if(!(formats2.validate(data1))){
validate56.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""}];
return false;
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/occurred_at",schemaPath:"#/properties/occurred_at/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs4 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.payload !== undefined){
let data2 = data.payload;
const _errs6 = errors;
const _errs7 = errors;
if(errors === _errs7){
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
let missing1;
if((((data2.prior_attempt_id === undefined) && (missing1 = "prior_attempt_id")) || ((data2.reviewed_tool_call_ids === undefined) && (missing1 = "reviewed_tool_call_ids"))) || ((data2.decision === undefined) && (missing1 = "decision"))){
validate56.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RecoveryApprovedPayload/required",keyword:"required",params:{missingProperty: missing1},message:"must have required property '"+missing1+"'"}];
return false;
}
else {
const _errs9 = errors;
for(const key1 in data2){
if(!(((key1 === "decision") || (key1 === "prior_attempt_id")) || (key1 === "reviewed_tool_call_ids"))){
validate56.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RecoveryApprovedPayload/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"}];
return false;
break;
}
}
if(_errs9 === errors){
if(data2.decision !== undefined){
let data3 = data2.decision;
const _errs10 = errors;
if(typeof data3 !== "string"){
validate56.errors = [{instancePath:instancePath+"/payload/decision",schemaPath:"#/$defs/RecoveryApprovedPayload/properties/decision/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("retry_mock_reads" !== data3){
validate56.errors = [{instancePath:instancePath+"/payload/decision",schemaPath:"#/$defs/RecoveryApprovedPayload/properties/decision/const",keyword:"const",params:{allowedValue: "retry_mock_reads"},message:"must be equal to constant"}];
return false;
}
var valid2 = _errs10 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.prior_attempt_id !== undefined){
let data4 = data2.prior_attempt_id;
const _errs12 = errors;
const _errs13 = errors;
let valid3 = false;
const _errs14 = errors;
if(errors === _errs14){
if(errors === _errs14){
if(typeof data4 === "string"){
if(!(formats0.test(data4))){
const err0 = {instancePath:instancePath+"/payload/prior_attempt_id",schemaPath:"#/$defs/RecoveryApprovedPayload/properties/prior_attempt_id/anyOf/0/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath:instancePath+"/payload/prior_attempt_id",schemaPath:"#/$defs/RecoveryApprovedPayload/properties/prior_attempt_id/anyOf/0/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
var _valid0 = _errs14 === errors;
valid3 = valid3 || _valid0;
const _errs16 = errors;
if(data4 !== null){
const err2 = {instancePath:instancePath+"/payload/prior_attempt_id",schemaPath:"#/$defs/RecoveryApprovedPayload/properties/prior_attempt_id/anyOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
var _valid0 = _errs16 === errors;
valid3 = valid3 || _valid0;
if(!valid3){
const err3 = {instancePath:instancePath+"/payload/prior_attempt_id",schemaPath:"#/$defs/RecoveryApprovedPayload/properties/prior_attempt_id/anyOf",keyword:"anyOf",params:{},message:"must match a schema in anyOf"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
validate56.errors = vErrors;
return false;
}
else {
errors = _errs13;
if(vErrors !== null){
if(_errs13){
vErrors.length = _errs13;
}
else {
vErrors = null;
}
}
}
var valid2 = _errs12 === errors;
}
else {
var valid2 = true;
}
if(valid2){
if(data2.reviewed_tool_call_ids !== undefined){
let data5 = data2.reviewed_tool_call_ids;
const _errs18 = errors;
if(errors === _errs18){
if(Array.isArray(data5)){
var valid4 = true;
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
let data6 = data5[i0];
const _errs20 = errors;
if(errors === _errs20){
if(errors === _errs20){
if(typeof data6 === "string"){
if(!(formats0.test(data6))){
validate56.errors = [{instancePath:instancePath+"/payload/reviewed_tool_call_ids/" + i0,schemaPath:"#/$defs/RecoveryApprovedPayload/properties/reviewed_tool_call_ids/items/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate56.errors = [{instancePath:instancePath+"/payload/reviewed_tool_call_ids/" + i0,schemaPath:"#/$defs/RecoveryApprovedPayload/properties/reviewed_tool_call_ids/items/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid4 = _errs20 === errors;
if(!valid4){
break;
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/payload/reviewed_tool_call_ids",schemaPath:"#/$defs/RecoveryApprovedPayload/properties/reviewed_tool_call_ids/type",keyword:"type",params:{type: "array"},message:"must be array"}];
return false;
}
}
var valid2 = _errs18 === errors;
}
else {
var valid2 = true;
}
}
}
}
}
}
else {
validate56.errors = [{instancePath:instancePath+"/payload",schemaPath:"#/$defs/RecoveryApprovedPayload/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
var valid0 = _errs6 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.run_id !== undefined){
let data7 = data.run_id;
const _errs22 = errors;
if(errors === _errs22){
if(errors === _errs22){
if(typeof data7 === "string"){
if(!(formats0.test(data7))){
validate56.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/format",keyword:"format",params:{format: "uuid"},message:"must match format \""+"uuid"+"\""}];
return false;
}
}
else {
validate56.errors = [{instancePath:instancePath+"/run_id",schemaPath:"#/properties/run_id/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
}
}
var valid0 = _errs22 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.schema_version !== undefined){
let data8 = data.schema_version;
const _errs24 = errors;
if(typeof data8 !== "string"){
validate56.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/type",keyword:"type",params:{type: "string"},message:"must be string"}];
return false;
}
if("1.1" !== data8){
validate56.errors = [{instancePath:instancePath+"/schema_version",schemaPath:"#/properties/schema_version/const",keyword:"const",params:{allowedValue: "1.1"},message:"must be equal to constant"}];
return false;
}
var valid0 = _errs24 === errors;
}
else {
var valid0 = true;
}
if(valid0){
if(data.seq !== undefined){
let data9 = data.seq;
const _errs26 = errors;
if(!(((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9))) && (isFinite(data9)))){
validate56.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/type",keyword:"type",params:{type: "integer"},message:"must be integer"}];
return false;
}
if(errors === _errs26){
if((typeof data9 == "number") && (isFinite(data9))){
if(data9 > 9007199254740991 || isNaN(data9)){
validate56.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"}];
return false;
}
else {
if(data9 < 1 || isNaN(data9)){
validate56.errors = [{instancePath:instancePath+"/seq",schemaPath:"#/properties/seq/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"}];
return false;
}
}
}
}
var valid0 = _errs26 === errors;
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
else {
validate56.errors = [{instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"}];
return false;
}
}
validate56.errors = vErrors;
return errors === 0;
}
validate56.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate23.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate24(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate26(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate28(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs4 = errors;
if(!(validate30(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs5 = errors;
if(!(validate32(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
var _valid0 = _errs5 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
const _errs6 = errors;
if(!(validate36(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
errors = vErrors.length;
}
var _valid0 = _errs6 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 5];
}
else {
if(_valid0){
valid0 = true;
passing0 = 5;
if(props0 !== true){
props0 = true;
}
}
const _errs7 = errors;
if(!(validate38(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate38.errors : vErrors.concat(validate38.errors);
errors = vErrors.length;
}
var _valid0 = _errs7 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 6];
}
else {
if(_valid0){
valid0 = true;
passing0 = 6;
if(props0 !== true){
props0 = true;
}
}
const _errs8 = errors;
if(!(validate42(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
errors = vErrors.length;
}
var _valid0 = _errs8 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 7];
}
else {
if(_valid0){
valid0 = true;
passing0 = 7;
if(props0 !== true){
props0 = true;
}
}
const _errs9 = errors;
if(!(validate44(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
errors = vErrors.length;
}
var _valid0 = _errs9 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 8];
}
else {
if(_valid0){
valid0 = true;
passing0 = 8;
if(props0 !== true){
props0 = true;
}
}
const _errs10 = errors;
if(!(validate48(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate48.errors : vErrors.concat(validate48.errors);
errors = vErrors.length;
}
var _valid0 = _errs10 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 9];
}
else {
if(_valid0){
valid0 = true;
passing0 = 9;
if(props0 !== true){
props0 = true;
}
}
const _errs11 = errors;
if(!(validate52(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate52.errors : vErrors.concat(validate52.errors);
errors = vErrors.length;
}
var _valid0 = _errs11 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 10];
}
else {
if(_valid0){
valid0 = true;
passing0 = 10;
if(props0 !== true){
props0 = true;
}
}
const _errs12 = errors;
if(!(validate54(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
errors = vErrors.length;
}
var _valid0 = _errs12 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 11];
}
else {
if(_valid0){
valid0 = true;
passing0 = 11;
if(props0 !== true){
props0 = true;
}
}
const _errs13 = errors;
if(!(validate56(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
errors = vErrors.length;
}
var _valid0 = _errs13 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 12];
}
else {
if(_valid0){
valid0 = true;
passing0 = 12;
if(props0 !== true){
props0 = true;
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
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
validate23.errors = vErrors;
return false;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate23.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate23.evaluated = {"dynamicProps":true,"dynamicItems":false};
