{{GLSL_VERSION}}
{{GLSL_EXTENSIONS}}
{{SUPPORTED_EXTENSIONS}}


struct Nothing{ //Nothing type, to encode if some variable doesn't contain any data
    bool _; //empty structs are not allowed
};

#define CIRCLE            0
#define RECTANGLE         1
#define ROUNDED_RECTANGLE 2
#define DISTANCEFIELD     3
#define TRIANGLE          4

#define ALIASING_CONST    0.70710678118654757
#define M_SQRT_2          1.4142135


{{distancefield_type}}  distancefield;
{{image_type}}          image;

uniform float           stroke_width;
uniform float           glow_width;
uniform int             shape; // shape is a uniform for now. Making them a varying && using them for control flow is expected to kill performance
uniform vec2            resolution;
uniform bool            transparent_picking;

flat in vec2            f_scale;
flat in vec4            f_color;
flat in vec4            f_stroke_color;
flat in vec4            f_glow_color;
flat in uvec2           f_id;
flat in int             f_primitive_index;
in vec2                 f_uv;
in vec2                 f_uv_offset;





float aastep(float threshold1, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * ALIASING_CONST;
    return smoothstep(threshold1-afwidth, threshold1+afwidth, value);
}
float aastep(float threshold1, float threshold2, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * ALIASING_CONST;
    return smoothstep(threshold1-afwidth, threshold1+afwidth, value)-smoothstep(threshold2-afwidth, threshold2+afwidth, value);
}

float triangle(vec2 P){
    P -= 0.5;
    float x = M_SQRT_2/2.0 * (P.x - P.y);
    float y = M_SQRT_2/2.0 * (P.x + P.y);
    float r1 = max(abs(x), abs(y)) - 1./(2*M_SQRT_2);
    float r2 = P.y;
    return -max(r1,r2);
}
float circle(vec2 uv){
    return (1-length(uv-0.5))-0.5;
}
float rectangle(vec2 uv){
    vec2 d = max(-uv, uv-vec2(1));
    return -((length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y))));
}
float rounded_rectangle(vec2 uv, vec2 tl, vec2 br){
    vec2 d = max(tl-uv, uv-br);
    return -((length(max(vec2(0.0), d)) + min(0.0, max(d.x, d.y)))-tl.x);
}



void fill(vec4 fillcolor, Nothing image, vec2 uv, float infill, inout vec4 color){
    color = mix(color, fillcolor, infill);
}
void fill(vec4 c, sampler2D image, vec2 uv, float infill, inout vec4 color){
    color = mix(color, texture(image, uv), infill);
}
void fill(vec4 c, sampler2DArray image, vec2 uv, float infill, inout vec4 color){
    color = mix(color, texture(image, vec3(uv, f_primitive_index)), infill);
}


void stroke(vec4 strokecolor, float signed_distance, float half_stroke, inout vec4 color){
    if (half_stroke > 0.0){
        float t = aastep(0, half_stroke, signed_distance);
        color = mix(color, strokecolor, t);
    }
}

void glow(vec4 glowcolor, float signed_distance, float outside, inout vec4 color){
    if (glow_width > 0.0){
        float alpha = 1-(outside*abs(clamp(signed_distance, -1, 0))*20); //TODO figure out better factor than 7
        color = mix(color, vec4(glowcolor.rgb, glowcolor.a*alpha), outside);
    }
}

float get_distancefield(sampler2D distancefield, vec2 uv){
    return -texture(distancefield, uv).r;
}
float get_distancefield(Nothing distancefield, vec2 uv){
    return 0.0;
}


#ifdef DEPTH_LAYOUT
    layout (depth_greater) out float gl_FragDepth;
#endif

out vec4  fragment_color;
out uvec2 fragment_groupid;
void write2framebuffer(vec4 color, uvec2 id){
    fragment_color   = color;
    fragment_groupid = id;
    if (color.a > 0.5){
        gl_FragDepth = gl_FragCoord.z;
    }else{
        gl_FragDepth = 1.0;
    }
}

void main(){

    float signed_distance = 0.0;

    if(shape == CIRCLE)
        signed_distance = circle(f_uv);
    else if(shape == DISTANCEFIELD)
        signed_distance = get_distancefield(distancefield, f_uv_offset);
    else if(shape == ROUNDED_RECTANGLE)
        signed_distance = rounded_rectangle(f_uv, vec2(0.2), vec2(0.8));
    else if(shape == RECTANGLE)
        signed_distance = rectangle(f_uv);
    else if(shape == TRIANGLE)
        signed_distance = triangle(f_uv);

    float half_stroke   = (stroke_width) / max(f_scale.x, f_scale.y);
    float inside        = aastep(half_stroke, 100.0, signed_distance);
    float outside       = abs(aastep(-100.0, 0.0, signed_distance));
    vec4 final_color    = vec4((inside > 0) ? f_color.rgb : f_stroke_color.rgb, 0);

    fill(f_color, image, f_uv_offset, inside, final_color);
    stroke(f_stroke_color, signed_distance, half_stroke, final_color);
    glow(f_glow_color, signed_distance, outside, final_color);
    write2framebuffer(final_color, f_id);
}
