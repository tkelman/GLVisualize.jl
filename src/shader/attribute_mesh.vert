{{GLSL_VERSION}}

in vec3 vertices;
in vec3 normals;
in float attribute_id;

uniform vec3 light[4];

uniform mat4 projection, view, model;
uniform sampler1D attributes;

void render(vec3 vertices, vec3 normals, vec4 color, mat4 viewmodel, mat4 projection, vec3 light[4]);

uniform uint objectid;
flat out uvec2 o_id;

void main()
{
	o_id = uvec2(objectid, attribute_id);
	vec4 instance_color = texelFetch(attributes, int(attribute_id), 0);
	render(vertices, normals, instance_color, view*model, projection, light);
}


